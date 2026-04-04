import { Router } from 'express'
import { authMiddleware } from '../auth/auth.middleware'
import * as NotificationController from './notification.controller'

const router = Router()

/* =========================
   USER ROUTES
========================= */

router.get(
  '/',
  authMiddleware,
  NotificationController.list
)

router.get(
  '/unread-count',
  authMiddleware,
  NotificationController.unreadCount
)

router.patch(
  '/:id/read',
  authMiddleware,
  NotificationController.markAsRead
)

router.patch(
  '/read-all',
  authMiddleware,
  NotificationController.markAllAsRead
)

/* =========================
   ADMIN ROUTES
========================= */

router.post(
  '/global',
  authMiddleware,
  NotificationController.createGlobal
)

export default router