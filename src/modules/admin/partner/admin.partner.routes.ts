import { Router } from 'express'
import { AdminPartnerController } from './admin.partner.controller'
import { authMiddleware } from '../../../modules/auth/auth.middleware'
import { adminOnly } from '../../../modules/admin/adminOnly'

const router = Router()

// GET /admin/partners
router.get('/', authMiddleware, adminOnly, AdminPartnerController.list)

// POST /admin/partners/:id/generate-settlement
router.post(
  '/:id/generate-settlement',
  authMiddleware,
  adminOnly,
  AdminPartnerController.generate
)

// GET /admin/partners/settlements/:id
router.get(
  '/settlements/:id',
  authMiddleware,
  adminOnly,
  AdminPartnerController.settlements
)

// PATCH /admin/partners/settlement/:id/pay
router.patch(
  '/settlement/:id/pay',
  authMiddleware,
  adminOnly,
  AdminPartnerController.pay
)

export default router