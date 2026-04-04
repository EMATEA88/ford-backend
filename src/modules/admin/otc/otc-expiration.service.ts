import { prisma } from '../../../lib/prisma'
import { OrderStatus, ChatStatus, SupportMessageType } from '@prisma/client'

const SYSTEM_ADMIN_ID = 1 // ⚠️ coloque aqui o ID real do admin SYSTEM

export class OTCExpirationService {

  static async expirePendingOrders() {

    const now = new Date()

    const ordersToExpire = await prisma.cryptoOrder.findMany({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: { lt: now }
      },
      include: {
        conversation: true
      }
    })

    if (ordersToExpire.length === 0) {
      return { expiredCount: 0 }
    }

    await prisma.$transaction(async (tx) => {

      for (const order of ordersToExpire) {

        // 1️⃣ Atualiza status
        await tx.cryptoOrder.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.EXPIRED,
            completedAt: new Date()
          }
        })

        // 2️⃣ Fecha conversa
        if (order.conversation) {

          await tx.supportConversation.update({
            where: { id: order.conversation.id },
            data: {
              status: ChatStatus.CLOSED,
              unreadAdmin: 0,
              unreadUser: 0
            }
          })

          // 3️⃣ Mensagem automática
          await tx.supportMessage.create({
            data: {
              conversationId: order.conversation.id,
              senderId: SYSTEM_ADMIN_ID,
              isAdmin: true,
              type: SupportMessageType.TEXT,
              content: "Ordem expirada automaticamente por tempo limite."
            }
          })
        }
      }

      // 4️⃣ Log consolidado
      await tx.adminLog.create({
        data: {
          adminId: SYSTEM_ADMIN_ID,
          action: 'AUTO_EXPIRE_OTC_ORDERS',
          entity: 'CryptoOrder',
          metadata: {
            expiredCount: ordersToExpire.length,
            orderIds: ordersToExpire.map(o => o.id)
          }
        }
      })

    })

    return {
      expiredCount: ordersToExpire.length
    }
  }
}