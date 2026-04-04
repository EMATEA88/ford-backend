import { prisma } from '../../lib/prisma'
import { SupportMessageType, ChatStatus } from '@prisma/client'

export class SupportService {

  // ================================
  // OPEN CONVERSATION BY ORDER
  // ================================
  static async openConversation(orderId: number, userId: number) {

    if (!orderId)
      throw new Error('INVALID_ORDER_ID')

    const order = await prisma.cryptoOrder.findUnique({
      where: { id: orderId }
    })

    if (!order)
      throw new Error('ORDER_NOT_FOUND')

    if (order.userId !== userId)
      throw new Error('NOT_ALLOWED')

    return prisma.supportConversation.upsert({
      where: { orderId },
      update: {},
      create: {
        orderId,
        userId
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  }

  // ================================
  // SEND MESSAGE
  // ================================
  static async sendMessage(params: {
    orderId: number
    senderId: number
    isAdmin: boolean
    type: SupportMessageType
    content: string
  }) {

    if (!params.content)
      throw new Error('EMPTY_MESSAGE')

    const conversation =
      await prisma.supportConversation.findUnique({
        where: { orderId: params.orderId }
      })

    if (!conversation)
      throw new Error('CONVERSATION_NOT_FOUND')

    if (conversation.status === ChatStatus.CLOSED)
      throw new Error('CHAT_CLOSED')

    const message = await prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.senderId,
        isAdmin: params.isAdmin,
        type: params.type,
        content: params.content
      }
    })

    await prisma.supportConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: params.content.slice(0, 120),
        unreadAdmin: params.isAdmin
          ? 0
          : { increment: 1 },
        unreadUser: params.isAdmin
          ? { increment: 1 }
          : 0
      }
    })

    return message
  }

  // ================================
  // GET CONVERSATION BY ORDER
  // ================================
  static async getConversation(orderId: number, userId: number) {

    const conversation =
      await prisma.supportConversation.findUnique({
        where: { orderId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })

    if (!conversation)
      return null

    if (conversation.userId !== userId)
      throw new Error('NOT_ALLOWED')

    return conversation
  }

  // ================================
  // ADMIN LIST ALL
  // ================================
  static async listAllConversations() {

    return prisma.supportConversation.findMany({
      include: {
        user: {
          select: {
            id: true,
            phone: true
          }
        },
        order: {
          select: {
            id: true,
            asset: { select: { symbol: true } },
            type: true,
            totalAoa: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
  }

  // ================================
  // CLOSE CHAT
  // ================================
  static async closeConversation(orderId: number) {

    return prisma.supportConversation.update({
      where: { orderId },
      data: { status: ChatStatus.CLOSED }
    })
  }
}
