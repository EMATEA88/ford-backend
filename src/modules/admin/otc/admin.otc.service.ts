import { prisma } from "../../../lib/prisma"
import { io } from "../../../server"
import cloudinary from "../../../config/cloudinary"
import { EmailService } from "../../../services/email.service"
import {
  OrderStatus,
  RevenueType,
  OrderType,
  ChatStatus,
  SupportMessageType
} from "@prisma/client"

export class AdminOTCService {

  /* =====================================================
     GET ONE
  ===================================================== */
  static async getOne(id: number) {
    return prisma.cryptoOrder.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, phone: true } },
        asset: true,
        conversation: {
          include: {
            messages: { orderBy: { createdAt: "asc" } }
          }
        }
      }
    })
  }

  /* =====================================================
     LIST
  ===================================================== */
  static async list(page = 1, limit = 20, status?: OrderStatus, type?: OrderType) {

    const skip = (page - 1) * limit
    const where: any = {}

    if (status) where.status = status
    if (type) where.type = type

    const [items, total] = await Promise.all([
      prisma.cryptoOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, phone: true } },
          asset: true,
          conversation: { select: { id: true, unreadAdmin: true } }
        }
      }),
      prisma.cryptoOrder.count({ where })
    ])

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  /* ================= AUDIT ================= */
static async audit(page: number, limit: number) {

  const skip = (page - 1) * limit

  const [data, total] = await prisma.$transaction([
    prisma.cryptoOrder.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        asset: {
          select: {
            symbol: true
          }
        }
      }
    }),
    prisma.cryptoOrder.count()
  ])

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    data
  }
}

  /* =====================================================
   SEND MESSAGE
===================================================== */
static async sendMessage(
  orderId: number,
  adminId: number,
  content: string,
  type: SupportMessageType = SupportMessageType.TEXT
) {

  const result = await prisma.$transaction(async (tx) => {

    const admin = await tx.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || admin.role !== "ADMIN")
      throw new Error("FORBIDDEN")

    const order = await tx.cryptoOrder.findUnique({
      where: { id: orderId },
      include: {
  conversation: true,
  user: {
    select: {
      id: true,
      email: true
    }
  }
}
    })

    if (!order) throw new Error("ORDER_NOT_FOUND")

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RELEASED ||
      order.status === OrderStatus.EXPIRED
    )
      throw new Error("CHAT_CLOSED")

    if (!order.conversation)
      throw new Error("CONVERSATION_NOT_FOUND")

    const message = await tx.supportMessage.create({
      data: {
        conversationId: order.conversation.id,
        senderId: adminId,
        isAdmin: true,
        type,
        content
      }
    })

    await tx.supportConversation.update({
      where: { id: order.conversation.id },
      data: {
        lastMessage:
          type === SupportMessageType.IMAGE
            ? "📷 Imagem enviada"
            : content,
        unreadUser: { increment: 1 }
      }
    })

    return { message, order }
  })

  // 🔔 SOCKET
  io.to(`otc:${orderId}`).emit("otc:new-message", result.message)

  // 📧 EMAIL PARA USER
  try {
    if (result.order.user?.email) {
      await EmailService.sendEmail({
        to: result.order.user.email,
        subject: "Nova mensagem no seu Chat OTC",
        title: "Você recebeu uma nova mensagem",
        content: `
          <p>O administrador respondeu no seu chat OTC.</p>
          <p><strong>Mensagem:</strong></p>
          <div style="background:#f3f4f6;padding:12px;border-radius:6px;">
            ${type === SupportMessageType.IMAGE
              ? "📷 Imagem enviada"
              : content}
          </div>
        `,
        buttonText: "Abrir Chat OTC",
        buttonUrl: "https://ematea.org/otc"
      })
    }
  } catch (error) {
    console.error("ADMIN_OTC_EMAIL_ERROR:", error)
  }

  return result.message
}

  /* =====================================================
   UPLOAD IMAGE (ADMIN)
===================================================== */
static async uploadImage(
  orderId: number,
  adminId: number,
  file: Express.Multer.File
) {

  const result = await prisma.$transaction(async (tx) => {

    const admin = await tx.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || admin.role !== "ADMIN")
      throw new Error("FORBIDDEN")

    const order = await tx.cryptoOrder.findUnique({
      where: { id: orderId },
      include: {
        conversation: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })

    if (!order) throw new Error("ORDER_NOT_FOUND")

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RELEASED ||
      order.status === OrderStatus.EXPIRED
    )
      throw new Error("CHAT_CLOSED")

    if (!order.conversation)
      throw new Error("CONVERSATION_NOT_FOUND")

    const uploadedUrl = await new Promise<string>((resolve, reject) => {

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
        senderId: adminId,
        isAdmin: true,
        type: SupportMessageType.IMAGE,
        content: uploadedUrl
      }
    })

    await tx.supportConversation.update({
      where: { id: order.conversation.id },
      data: {
        lastMessage: "📷 Imagem enviada",
        unreadUser: { increment: 1 }
      }
    })

    return { message, order }
  })

  // 🔔 SOCKET
  io.to(`otc:${orderId}`).emit("otc:new-message", result.message)

  // 📧 EMAIL PARA USER
  try {
    if (result.order.user?.email) {
      await EmailService.sendEmail({
        to: result.order.user.email,
        subject: "Nova mensagem no seu Chat OTC",
        title: "Você recebeu uma nova mensagem",
        content: `
          <p>O administrador enviou uma imagem no seu chat OTC.</p>
          <div style="background:#f3f4f6;padding:12px;border-radius:6px;">
            📷 Imagem enviada
          </div>
        `,
        buttonText: "Abrir Chat OTC",
        buttonUrl: "https://ematea.org/otc"
      })
    }
  } catch (error) {
    console.error("ADMIN_OTC_IMAGE_EMAIL_ERROR:", error)
  }

  return result.message
}

  /* =====================================================
   RELEASE
===================================================== */
static async release(orderId: number, adminId: number) {

  const result = await prisma.$transaction(async (tx) => {

    const admin = await tx.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || admin.role !== "ADMIN")
      throw new Error("FORBIDDEN")

    const order = await tx.cryptoOrder.findUnique({
      where: { id: orderId },
      include: {
  conversation: true,
  asset: true,
  user: {
    select: {
      id: true,
      email: true
    }
  }
}
    })

    if (!order) throw new Error("ORDER_NOT_FOUND")

    if (order.status !== OrderStatus.PAID)
      throw new Error("ORDER_NOT_READY")

    await tx.cryptoOrder.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.RELEASED,
        completedAt: new Date()
      }
    })

    if (order.conversation) {
      await tx.supportConversation.update({
        where: { id: order.conversation.id },
        data: { status: ChatStatus.CLOSED }
      })
    }

    return order
  })

  // 🔔 SOCKETS
  io.to(`otc:${orderId}`).emit("otc:status-update", {
    orderId,
    status: OrderStatus.RELEASED
  })

  io.to("admin:global").emit("admin:order-status", {
    orderId,
    status: OrderStatus.RELEASED
  })

  // 📧 EMAIL PARA USER
  try {
    if (result.user?.email) {
      await EmailService.sendEmail({
        to: result.user.email,
        subject: "Ordem OTC liberada",
        title: "Sua ordem foi liberada",
        content: `
          <p>A ordem #${orderId} foi liberada com sucesso.</p>
          <p><strong>Ativo:</strong> ${result.asset.symbol}</p>
        `,
        buttonText: "Ver minhas ordens",
        buttonUrl: "https://ematea.org/otc"
      })
    }
  } catch (error) {
    console.error("OTC_RELEASE_EMAIL_ERROR:", error)
  }

  return { success: true }
}

  /* =====================================================
     CANCEL
  ===================================================== */
  static async cancel(orderId: number) {

    const order = await prisma.cryptoOrder.findUnique({
      where: { id: orderId }
    })

    if (!order) throw new Error("ORDER_NOT_FOUND")

    await prisma.cryptoOrder.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED }
    })

    io.to(`otc:${orderId}`).emit("otc:status-update", {
      orderId,
      status: OrderStatus.CANCELLED
    })

    io.to("admin:global").emit("admin:order-status", {
      orderId,
      status: OrderStatus.CANCELLED
    })

    return { success: true }
  }

  /* =====================================================
     LIST ASSETS
  ===================================================== */
  static async listAssets() {
    return prisma.asset.findMany({
      orderBy: { symbol: "asc" }
    })
  }

  /* =====================================================
     UPDATE ASSET
  ===================================================== */
  static async updateAsset(id: number, buyPrice: number, sellPrice: number, adminId: number) {

    const asset = await prisma.asset.findUnique({ where: { id } })
    if (!asset) throw new Error("ASSET_NOT_FOUND")

    await prisma.asset.update({
      where: { id },
      data: { buyPrice, sellPrice }
    })

    await prisma.assetPriceHistory.create({
      data: {
        assetId: id,
        oldBuy: asset.buyPrice,
        newBuy: buyPrice,
        oldSell: asset.sellPrice,
        newSell: sellPrice,
        adminId
      }
    })

    return { success: true }
  }

  /* =====================================================
     FINANCIAL SUMMARY
  ===================================================== */
  static async financialSummary() {

    const volume = await prisma.cryptoOrder.aggregate({
      where: { status: OrderStatus.RELEASED },
      _sum: { totalAoa: true }
    })

    const revenue = await prisma.companyRevenue.aggregate({
      where: { type: RevenueType.OTC_PROFIT },
      _sum: { amount: true }
    })

    return {
      totalVolume: volume._sum.totalAoa || 0,
      totalProfit: revenue._sum.amount || 0
    }
  }

  /* ================= PRICE HISTORY ================= */
static async priceHistory(page: number, limit: number) {

  const skip = (page - 1) * limit

  const [data, total] = await prisma.$transaction([
    prisma.assetPriceHistory.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.assetPriceHistory.count()
  ])

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    data
  }
}

  /* =====================================================
     STATS
  ===================================================== */
  static async stats() {

    const [
      totalOrders,
      pending,
      paid,
      released,
      cancelled,
      expired,
      disputed
    ] = await Promise.all([
      prisma.cryptoOrder.count(),
      prisma.cryptoOrder.count({ where: { status: OrderStatus.PENDING } }),
      prisma.cryptoOrder.count({ where: { status: OrderStatus.PAID } }),
      prisma.cryptoOrder.count({ where: { status: OrderStatus.RELEASED } }),
      prisma.cryptoOrder.count({ where: { status: OrderStatus.CANCELLED } }),
      prisma.cryptoOrder.count({ where: { status: OrderStatus.EXPIRED } }),
      prisma.cryptoOrder.count({ where: { status: OrderStatus.DISPUTED } })
    ])

    return {
      totalOrders,
      pending,
      paid,
      released,
      cancelled,
      expired,
      disputed
    }
  }
}