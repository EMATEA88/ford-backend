import { Router } from 'express'
import { authMiddleware } from '../auth/auth.middleware'
import { adminOnly } from '../admin/adminOnly'
import { GiftController } from './gift.controller'

const router = Router()

/* ADMIN ONLY */
router.post(
  '/generate',
  authMiddleware,
  adminOnly,
  GiftController.generate
)

/* USER */
router.post(
  '/redeem',
  authMiddleware,
  GiftController.redeem
)

export default router