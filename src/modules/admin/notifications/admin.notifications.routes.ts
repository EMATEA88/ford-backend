import { Router } from 'express'
import { authMiddleware } from '../../auth/auth.middleware'
import { adminOnly } from '../adminOnly'
import { AdminNotificationsController } from './admin.notifications.controller'

const router = Router()

/* =====================================================
   LIST
===================================================== */

router.get(
  '/',
  authMiddleware,
  adminOnly,
  AdminNotificationsController.list
)

router.get(
  '/unread-count',
  authMiddleware,
  adminOnly,
  AdminNotificationsController.countUnread
)

/* =====================================================
   CREATE (USER OU GLOBAL)
===================================================== */

router.post(
  '/',
  authMiddleware,
  adminOnly,
  AdminNotificationsController.create
)

/* =====================================================
   BROADCAST (TODOS USERS)
===================================================== */

router.post(
  '/broadcast',
  authMiddleware,
  adminOnly,
  AdminNotificationsController.broadcast
)

/* =====================================================
   DELETE NOTIFICATION
===================================================== */

router.delete(
  '/:id',
  authMiddleware,
  adminOnly,
  AdminNotificationsController.delete
)

export default router