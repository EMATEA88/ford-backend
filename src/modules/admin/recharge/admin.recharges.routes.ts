import { Router } from 'express'
import { AdminRechargeController } from './admin.recharge.controller'
import { authMiddleware } from '../../auth/auth.middleware'
import { adminOnly } from '../adminOnly'

const router = Router()

// 🔐 Proteção local obrigatória
router.use(authMiddleware, adminOnly)

// ================= LIST =================
router.get('/', AdminRechargeController.list)

// ================= APPROVE =================
router.patch('/:id/approve', AdminRechargeController.approve)

// ================= REJECT =================
router.patch('/:id/reject', AdminRechargeController.reject)

export default router
