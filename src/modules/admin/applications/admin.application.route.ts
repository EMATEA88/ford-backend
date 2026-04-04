import { Router } from 'express'
import { AdminApplicationController } from './admin.application.controller'
import { authMiddleware } from '../../../modules/auth/auth.middleware'
import { adminOnly } from '../../../modules/admin/adminOnly'

const router = Router()

router.get(
  '/',
  authMiddleware,
  adminOnly,
  AdminApplicationController.list
)

router.get(
  '/:id',
  authMiddleware,
  adminOnly,
  AdminApplicationController.details
)

router.get(
  '/stats',
  authMiddleware,
  adminOnly,
  AdminApplicationController.stats
)

router.patch(
  '/:id/cancel',
  authMiddleware,
  adminOnly,
  AdminApplicationController.cancel
)

export default router