import { prisma } from '../../lib/prisma'

type NotificationTypeValue =
  | 'INFO'
  | 'WARNING'
  | 'SUCCESS'
  | 'SYSTEM'

type CreateNotificationInput = {
  title: string
  message: string
  type?: NotificationTypeValue
  userId?: number
}

/* =========================
   CREATE
========================= */

export async function createNotification(
  data: CreateNotificationInput
) {
  try {
    return await prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type ?? 'INFO',
        userId: data.userId ?? null,
      },
    })
  } catch (e) {
    console.error('[createNotification]', e)
    return null
  }
}

export async function createGlobalNotification(
  title: string,
  message: string,
  type: NotificationTypeValue = 'SYSTEM'
) {
  try {
    return await prisma.notification.create({
      data: {
        title,
        message,
        type,
        userId: null,
      },
    })
  } catch (e) {
    console.error('[createGlobalNotification]', e)
    return null
  }
}

/* =========================
   LIST + COUNT
========================= */

export async function listNotifications(
  userId: number,
  params?: {
    limit?: number
    offset?: number
  }
) {
  const limit = params?.limit ?? 20
  const offset = params?.offset ?? 0

  let items: any[] = []
  let unread = 0

  try {
    items = await prisma.notification.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    unread = await prisma.notification.count({
      where: {
        isRead: false,
        OR: [{ userId }, { userId: null }],
      },
    })
  } catch (e) {
    console.error('[listNotifications] DB unavailable', e)
  }

  return {
    items,
    unread,
  }
}

/* =========================
   UNREAD COUNT (NOVO)
========================= */

export async function getUnreadCount(
  userId: number
) {
  try {
    return await prisma.notification.count({
      where: {
        isRead: false,
        OR: [{ userId }, { userId: null }],
      },
    })
  } catch (e) {
    console.error('[getUnreadCount]', e)
    return 0
  }
}

/* =========================
   READ
========================= */

export async function markAsRead(
  userId: number,
  notificationId: number
) {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        OR: [{ userId }, { userId: null }],
      },
    })

    if (!notification) {
      return null
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  } catch (e) {
    console.error('[markAsRead]', e)
    return null
  }
}

export async function markAllAsRead(userId: number) {
  try {
    return await prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [{ userId }, { userId: null }],
      },
      data: { isRead: true },
    })
  } catch (e) {
    console.error('[markAllAsRead]', e)
    return { count: 0 }
  }
}