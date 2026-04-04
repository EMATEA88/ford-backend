import { prisma } from "../../lib/prisma"
import { OrderStatus, SupportMessageType } from "@prisma/client"
import { io } from "../../server"
import { EmailService } from "../../services/email.service"

const MAX_MESSAGE_LENGTH = 1000
const MESSAGE_RATE_LIMIT_SECONDS = 3

export class OTCChatService {

  static async getByOrder(userId: number, orderId: number) {

    if (!userId)
      throw new Error("UNAUTHORIZED")

    return prisma.$transaction(async (tx) => {

      const order = await tx.cryptoOrder.findUnique({
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

      if (!order)
        throw new Error("ORDER_NOT_FOUND")

      if (order.userId !== userId)
        throw new Error("NOT_ALLOWED")

      let conversation = order.conversation

      if (!conversation) {
        conversation = await tx.supportConversation.create({
          data: {
            userId,
            orderId,
            lastMessage: "Chat iniciado",
            unreadAdmin: 0,
            unreadUser: 0
          },
          include: {
            messages: {
              orderBy: { createdAt: "asc" }
            }
          }
        })
      }

      await tx.supportConversation.update({
        where: { id: conversation.id },
        data: { unreadUser: 0 }
      })

      return {
        order: {
          id: order.id,
          type: order.type,
          status: order.status,
          expiresAt: order.expiresAt,
          totalAoa: order.totalAoa,
          asset: { symbol: order.asset.symbol }
        },
        conversationId: conversation.id,
        messages: conversation.messages
      }
    })
  }

  static async sendMessage(
    userId: number,
    orderId: number,
    content: string
  ) {

    if (!userId)
      throw new Error("UNAUTHORIZED")

    if (!content || content.trim().length === 0)
      throw new Error("EMPTY_MESSAGE")

    if (content.length > MAX_MESSAGE_LENGTH)
      throw new Error("MESSAGE_TOO_LONG")

    const sanitized = content.trim()

    const result = await prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({
        where: { id: userId }
      })

      if (!user)
        throw new Error("USER_NOT_FOUND")

      if (user.isBlocked)
        throw new Error("USER_BLOCKED")

      const order = await tx.cryptoOrder.findUnique({
        where: { id: orderId },
        include: { conversation: true }
      })

      if (!order)
        throw new Error("ORDER_NOT_FOUND")

      if (order.userId !== userId)
        throw new Error("NOT_ALLOWED")

      if (
        order.status === OrderStatus.RELEASED ||
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.EXPIRED
      ) {
        throw new Error("CHAT_CLOSED")
      }

      if (!order.conversation)
        throw new Error("CHAT_NOT_FOUND")

      const lastMessage = await tx.supportMessage.findFirst({
        where: {
          conversationId: order.conversation.id,
          senderId: userId
        },
        orderBy: { createdAt: "desc" }
      })

      if (lastMessage) {
        const seconds =
          (Date.now() -
            new Date(lastMessage.createdAt).getTime()) / 1000

        if (seconds < MESSAGE_RATE_LIMIT_SECONDS)
          throw new Error("RATE_LIMIT")
      }

      const message = await tx.supportMessage.create({
        data: {
          conversationId: order.conversation.id,
          senderId: userId,
          isAdmin: false,
          type: SupportMessageType.TEXT,
          content: sanitized
        }
      })

      await tx.supportConversation.update({
        where: { id: order.conversation.id },
        data: {
          lastMessage: sanitized,
          unreadAdmin: { increment: 1 }
        }
      })

      return { message, user, order }
    })

    // 🔔 SOCKET
    io.to(`otc:${orderId}`).emit(
      "otc:new-message",
      result.message
    )

    // 📧 EMAIL PARA ADMIN
    try {
      const admin = await prisma.user.findFirst({
        where: { role: "ADMIN" }
      })

      if (admin?.email) {
        await EmailService.sendEmail({
          to: admin.email,
          subject: "Nova mensagem no Chat OTC",
          title: "Nova mensagem recebida no OTC",
          content: `
            <p>Um usuário enviou uma nova mensagem no chat OTC.</p>
            <p><strong>Mensagem:</strong></p>
            <div style="background:#f3f4f6;padding:12px;border-radius:6px;">
              ${result.message.content}
            </div>
          `,
          buttonText: "Abrir painel OTC",
          buttonUrl: "https://ematea.org/admin/otc"
        })
      }
    } catch (error) {
      console.error("OTC_EMAIL_ERROR:", error)
    }

    return result.message
  }
}