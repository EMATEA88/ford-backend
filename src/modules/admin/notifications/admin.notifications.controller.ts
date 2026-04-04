import { Request, Response } from 'express'
import { AdminNotificationsService } from './admin.notifications.service'
import { NotificationType } from '@prisma/client'

export class AdminNotificationsController {

  /* =====================================================
     LIST
  ===================================================== */

  static async list(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 20

      const data = await AdminNotificationsService.list(page, limit)
      return res.json(data)

    } catch (err) {
      console.error('[AdminNotificationsController.list]', err)
      return res.status(500).json({ error: 'INTERNAL_ERROR' })
    }
  }

  /* =====================================================
     UNREAD COUNT
  ===================================================== */

  static async countUnread(req: Request, res: Response) {
    try {
      const count = await AdminNotificationsService.countUnread()
      return res.json({ unread: count })
    } catch (err) {
      console.error('[AdminNotificationsController.countUnread]', err)
      return res.status(500).json({ error: 'COUNT_FAILED' })
    }
  }

  /* =====================================================
     CREATE (USER OU GLOBAL)
  ===================================================== */

  static async create(req: Request, res: Response) {
    try {
      const { title, message, type, userId } = req.body

      const data = await AdminNotificationsService.create(
        title,
        message,
        type ?? NotificationType.INFO,
        userId
      )

      return res.json(data)

    } catch (err) {
      console.error('[AdminNotificationsController.create]', err)
      return res.status(500).json({ error: 'CREATE_NOTIFICATION_FAILED' })
    }
  }

  /* =====================================================
     BROADCAST (TODOS USERS)
  ===================================================== */

  static async broadcast(req: Request, res: Response) {
    try {
      const { title, message, type } = req.body

      const data = await AdminNotificationsService.broadcast(
        title,
        message,
        type ?? NotificationType.INFO
      )

      return res.json(data)

    } catch (err) {
      console.error('[AdminNotificationsController.broadcast]', err)
      return res.status(500).json({ error: 'BROADCAST_FAILED' })
    }
  }

  /* =====================================================
     DELETE (ADMIN)
  ===================================================== */

  static async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)

      if (!id) {
        return res.status(400).json({
          error: 'INVALID_NOTIFICATION_ID'
        })
      }

      await AdminNotificationsService.delete(id)

      return res.json({
        success: true,
        message: 'NOTIFICATION_DELETED'
      })

    } catch (err: any) {

      if (err.message === 'NOTIFICATION_NOT_FOUND') {
        return res.status(404).json({
          error: err.message
        })
      }

      console.error('[AdminNotificationsController.delete]', err)
      return res.status(500).json({
        error: 'DELETE_NOTIFICATION_FAILED'
      })
    }
  }

}