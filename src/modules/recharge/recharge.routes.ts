import { Router } from 'express'
import { authMiddleware } from '../auth/auth.middleware'
import { adminOnly } from '../admin/adminOnly'
import { RechargeController } from './recharge.controller'

const router = Router()

/**
 * ================= USER ROUTES =================
 */

// Criar recarga
router.post(
  '/',
  authMiddleware,
  RechargeController.create
)

// Histórico do próprio usuário
router.get(
  '/my',
  authMiddleware,
  RechargeController.myHistory
)

/**
 * ================= ADMIN ROUTES =================
 */

// Aprovar recarga (ADMIN)
router.patch(
  '/:id/approve',
  authMiddleware,
  adminOnly,
  RechargeController.approve
)

export const rechargeRoutes = router
