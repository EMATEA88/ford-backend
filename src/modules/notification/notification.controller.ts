import { Request, Response } from 'express'
import * as NotificationService from './notification.service'
import { NotificationType } from '../../@types/enums'

/* =========================
   CREATE
========================= */

export async function createGlobal(
  req: Request,
  res: Response
) {
  try {
    const { title, message, type } = req.body

    if (!title || !message) {
      return res.status(400).json({
        message: 'TITLE_AND_MESSAGE_REQUIRED',
      })
    }

    const notification =
      await NotificationService.createGlobalNotification(
        title,
        message,
        type as NotificationType
      )

    return res.status(201).json(notification)
  } catch (err) {
    console.error('Notification.createGlobal error:', err)
    return res
      .status(500)
      .json({ message: 'INTERNAL_ERROR' })
  }
}

/* =========================
   LIST (INCLUI COUNT)
========================= */

export async function list(req: Request, res: Response) {
  try {
    const userId = (req as any).userId

    if (!userId) {
      return res
        .status(401)
        .json({ message: 'UNAUTHORIZED' })
    }

    const limit = req.query.limit
      ? Number(req.query.limit)
      : undefined

    const offset = req.query.offset
      ? Number(req.query.offset)
      : undefined

    if (
      (limit !== undefined && isNaN(limit)) ||
      (offset !== undefined && isNaN(offset))
    ) {
      return res
        .status(400)
        .json({ message: 'INVALID_PAGINATION' })
    }

    const data =
      await NotificationService.listNotifications(
        userId,
        { limit, offset }
      )

    return res.json(data)
  } catch (err) {
    console.error('Notification.list error:', err)
    return res
      .status(500)
      .json({ message: 'INTERNAL_ERROR' })
  }
}

/* =========================
   UNREAD COUNT (NOVO)
========================= */

export async function unreadCount(
  req: Request,
  res: Response
) {
  try {
    const userId = (req as any).userId

    if (!userId) {
      return res
        .status(401)
        .json({ message: 'UNAUTHORIZED' })
    }

    const count =
      await NotificationService.getUnreadCount(userId)

    return res.json({ unread: count })
  } catch (err) {
    console.error(
      'Notification.unreadCount error:',
      err
    )
    return res
      .status(500)
      .json({ message: 'INTERNAL_ERROR' })
  }
}

/* =========================
   READ
========================= */

export async function markAsRead(
  req: Request,
  res: Response
) {
  try {
    const userId = (req as any).userId
    const { id } = req.params

    if (!userId) {
      return res
        .status(401)
        .json({ message: 'UNAUTHORIZED' })
    }

    const notificationId = Number(id)
    if (isNaN(notificationId)) {
      return res
        .status(400)
        .json({ message: 'INVALID_ID' })
    }

    await NotificationService.markAsRead(
      userId,
      notificationId
    )

    return res.json({ success: true })
  } catch (err: any) {
    console.error('Notification.markAsRead error:', err)

    return res
      .status(500)
      .json({ message: 'INTERNAL_ERROR' })
  }
}

export async function markAllAsRead(
  req: Request,
  res: Response
) {
  try {
    const userId = (req as any).userId

    if (!userId) {
      return res
        .status(401)
        .json({ message: 'UNAUTHORIZED' })
    }

    await NotificationService.markAllAsRead(userId)

    return res.json({ success: true })
  } catch (err) {
    console.error(
      'Notification.markAllAsRead error:',
      err
    )
    return res
      .status(500)
      .json({ message: 'INTERNAL_ERROR' })
  }
}