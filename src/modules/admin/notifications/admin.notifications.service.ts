import { prisma } from '../../../lib/prisma'
import { NotificationType } from '@prisma/client'

export class AdminNotificationsService {

  /* =====================================================
     LIST
  ===================================================== */

  static async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              phone: true
            }
          }
        }
      }),
      prisma.notification.count()
    ])

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  /* =====================================================
     COUNT UNREAD
  ===================================================== */

  static async countUnread() {
    return prisma.notification.count({
      where: { isRead: false }
    })
  }

  /* =====================================================
     CREATE (USER OU GLOBAL)
  ===================================================== */

  static async create(
    title: string,
    message: string,
    type: NotificationType = 'INFO',
    userId?: number
  ) {
    return prisma.notification.create({
      data: {
        title,
        message,
        type,
        userId: userId || null
      }
    })
  }

  /* =====================================================
     BROADCAST (TODOS USERS)
  ===================================================== */

  static async broadcast(
    title: string,
    message: string,
    type: NotificationType = 'INFO'
  ) {
    const users = await prisma.user.findMany({
      select: { id: true }
    })

    if (!users.length) {
      return { count: 0 }
    }

    return prisma.notification.createMany({
      data: users.map(u => ({
        title,
        message,
        type,
        userId: u.id
      }))
    })
  }

  /* =====================================================
     DELETE (ADMIN)
  ===================================================== */

  static async delete(id: number) {
    const exists = await prisma.notification.findUnique({
      where: { id }
    })

    if (!exists) {
      throw new Error('NOTIFICATION_NOT_FOUND')
    }

    return prisma.notification.delete({
      where: { id }
    })
  }

}