import { prisma } from "../../lib/prisma"
import {
  OrderStatus,
  OrderType,
  VerificationStatus,
  SupportMessageType,
  Prisma
} from "@prisma/client"
import { io } from "../../server"
import cloudinary from "../../config/cloudinary"
import { z } from "zod"
import { EmailService } from "../../services/email.service"

const MAX_MESSAGE_LENGTH = 1000
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MIN_ORDER_VALUE = new Prisma.Decimal(1000)

const orderSchema = z.object({
  assetId: z.number().positive(),
  quantity: z.number().positive().max(1_000_000),
  type: z.nativeEnum(OrderType)
})

export class UserOTCService {

  /* ================= LIST ASSETS ================= */
  static async listAssets() {
    return prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { symbol: "asc" },
      select: {
        id: true,
        symbol: true,
        buyPrice: true,
        sellPrice: true
      }
    })
  }

  /* ================= GET ORDER ================= */
  static async getOrderById(userId: number, orderId: number) {

    if (!userId) throw new Error("UNAUTHORIZED")

    const order = await prisma.cryptoOrder.findUnique({
      where: { id: orderId },
      include: {
        asset: true,
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 200
            }
          }
        }
      }
    })

    if (!order) throw new Error("ORDER_NOT_FOUND")
    if (order.userId !== userId) throw new Error("NOT_ALLOWED")

    return order
  }

  /* ================= MY ORDERS ================= */
  static async myOrders(userId: number) {
    return prisma.cryptoOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        asset: { select: { symbol: true } },
        conversation: { select: { id: true } }
      }
    })
  }

  /* ================= CREATE ORDER ================= */
static async createOrder(
  userId: number,
  assetId: number,
  type: OrderType,
  quantity: number
) {

  orderSchema.parse({ assetId, quantity, type })

  const result = await prisma.$transaction(async (tx) => {

    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { bank: true, verification: true }
    })

    if (!user) throw new Error("USER_NOT_FOUND")
    if (user.isBlocked) throw new Error("USER_BLOCKED")

    if (!user.verification ||
        user.verification.status !== VerificationStatus.VERIFIED)
      throw new Error("USER_NOT_VERIFIED")

    if (!user.bank)
      throw new Error("BANK_NOT_LINKED")

    const asset = await tx.asset.findUnique({
      where: { id: assetId }
    })

    if (!asset || !asset.isActive)
      throw new Error("ASSET_NOT_AVAILABLE")

    const priceUsed = new Prisma.Decimal(
      type === OrderType.BUY
        ? asset.sellPrice
        : asset.buyPrice
    )

    const decimalQuantity = new Prisma.Decimal(quantity)
    const totalAoa = decimalQuantity.mul(priceUsed)

    if (totalAoa.lt(MIN_ORDER_VALUE))
      throw new Error("ORDER_VALUE_TOO_LOW")

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    const order = await tx.cryptoOrder.create({
      data: {
        userId,
        assetId,
        type,
        quantity: decimalQuantity,
        priceUsed,
        totalAoa,
        status: OrderStatus.PENDING,
        expiresAt
      }
    })

    const conversation = await tx.supportConversation.create({
      data: {
        userId,
        orderId: order.id,
        lastMessage: `Ordem OTC #${order.id} criada`,
        unreadAdmin: 1
      }
    })

    const msg = await tx.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        isAdmin: false,
        type: SupportMessageType.TEXT,
        content: `Ordem criada (${type}) ${quantity} ${asset.symbol}`
      }
    })

    return { order, asset }
  })

  // 🔔 SOCKETS (mantém seu funcionamento)
  io.to(`user:${userId}`).emit("otc:new-order", result.order)
  io.to("admin:global").emit("admin:new-order", result.order)

  // 📧 EMAIL PARA ADMIN (fora da transação)
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    })

    if (admin?.email) {
      await EmailService.sendEmail({
        to: admin.email,
        subject: "Nova ordem OTC criada",
        title: "Nova ordem OTC",
        content: `
          <p>Uma nova ordem foi criada:</p>
          <ul>
            <li><strong>ID:</strong> ${result.order.id}</li>
            <li><strong>Tipo:</strong> ${result.order.type}</li>
            <li><strong>Ativo:</strong> ${result.asset.symbol}</li>
            <li><strong>Quantidade:</strong> ${result.order.quantity}</li>
            <li><strong>Total AOA:</strong> ${result.order.totalAoa}</li>
          </ul>
        `,
        buttonText: "Abrir painel OTC",
        buttonUrl: "https://ematea.org/admin/otc"
      })
    }
  } catch (error) {
    console.error("OTC_ORDER_EMAIL_ERROR:", error)
  }

  return result.order
}

  /* ================= UPLOAD IMAGE ================= */
  static async uploadImage(
    userId: number,
    orderId: number,
    file: Express.Multer.File
  ) {

    if (!file || !file.buffer)
      throw new Error("NO_FILE")

    if (!file.mimetype.startsWith("image/"))
      throw new Error("INVALID_FILE_TYPE")

    if (file.size > MAX_IMAGE_SIZE)
      throw new Error("FILE_TOO_LARGE")

    return prisma.$transaction(async (tx) => {

      const order = await tx.cryptoOrder.findUnique({
        where: { id: orderId },
        include: { conversation: true }
      })

      if (!order) throw new Error("ORDER_NOT_FOUND")
      if (order.userId !== userId)
        throw new Error("NOT_ALLOWED")

      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.RELEASED ||
        order.status === OrderStatus.EXPIRED
      )
        throw new Error("CHAT_CLOSED")

      if (!order.conversation)
        throw new Error("CONVERSATION_NOT_FOUND")

      const uploadedUrl: string = await new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `otc-chat/${orderId}`,
            resource_type: "image",
            transformation: [
              { width: 1200, crop: "limit" },
              { quality: "auto" }
            ]
          },
          (error, result) => {
            if (error || !result?.secure_url)
              return reject(new Error("UPLOAD_FAILED"))
            resolve(result.secure_url)
          }
        )

        stream.end(file.buffer)
      })

      const message = await tx.supportMessage.create({
        data: {
          conversationId: order.conversation.id,
          senderId: userId,
          isAdmin: false,
          type: SupportMessageType.IMAGE,
          content: uploadedUrl
        }
      })

      await tx.supportConversation.update({
        where: { id: order.conversation.id },
        data: {
          lastMessage: "📷 Imagem enviada",
          unreadAdmin: { increment: 1 }
        }
      })

      io.to(`otc:${orderId}`).emit("otc:new-message", message)

      return message
    })
  }

  /* ================= MARK AS PAID ================= */
static async markAsPaid(userId: number, orderId: number) {

  const result = await prisma.$transaction(async (tx) => {

    const order = await tx.cryptoOrder.findUnique({
      where: { id: orderId },
      include: { conversation: true, asset: true }
    })

    if (!order) throw new Error("ORDER_NOT_FOUND")
    if (order.userId !== userId)
      throw new Error("NOT_ALLOWED")

    if (order.status !== OrderStatus.PENDING)
      throw new Error("INVALID_STATUS")

    if (order.expiresAt < new Date())
      throw new Error("ORDER_EXPIRED")

    await tx.cryptoOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID }
    })

    const msg = await tx.supportMessage.create({
      data: {
        conversationId: order.conversation!.id,
        senderId: userId,
        isAdmin: false,
        type: SupportMessageType.TEXT,
        content: "Pagamento marcado como realizado."
      }
    })

    return { order }
  })

  io.to(`otc:${orderId}`).emit("otc:status-update", {
    orderId,
    status: OrderStatus.PAID
  })

  // 📧 Email para ADMIN
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    })

    if (admin?.email) {
      await EmailService.sendEmail({
        to: admin.email,
        subject: "Ordem OTC marcada como paga",
        title: "Pagamento confirmado pelo usuário",
        content: `
          <p>A ordem #${orderId} foi marcada como paga.</p>
        `,
        buttonText: "Abrir ordem",
        buttonUrl: "https://ematea.org/admin/otc"
      })
    }
  } catch (error) {
    console.error("OTC_PAID_EMAIL_ERROR:", error)
  }

  return { success: true }
}

  /* ================= CANCEL ================= */
static async cancelOrder(userId: number, orderId: number) {

  const order = await prisma.cryptoOrder.findUnique({
    where: { id: orderId },
    include: { asset: true }
  })

  if (!order) throw new Error("ORDER_NOT_FOUND")
  if (order.userId !== userId)
    throw new Error("NOT_ALLOWED")

  if (order.status !== OrderStatus.PENDING)
    throw new Error("INVALID_STATUS")

  await prisma.cryptoOrder.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED }
  })

  // 📧 Email para ADMIN
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" }
    })

    if (admin?.email) {
      await EmailService.sendEmail({
        to: admin.email,
        subject: "Ordem OTC cancelada",
        title: "Ordem cancelada pelo usuário",
        content: `
          <p>A ordem #${orderId} foi cancelada.</p>
          <p><strong>Ativo:</strong> ${order.asset.symbol}</p>
        `,
        buttonText: "Abrir painel OTC",
        buttonUrl: "https://ematea.org/admin/otc"
      })
    }
  } catch (error) {
    console.error("OTC_CANCEL_EMAIL_ERROR:", error)
  }

  return { success: true }
}

  /* ================= DISPUTE ================= */
  static async openDispute(userId: number, orderId: number) {

    return prisma.cryptoOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.DISPUTED }
    })
  }
}