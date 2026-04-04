import { Router } from 'express'
import { AdminWithdrawalsController } from './admin.withdrawals.controller'
import { authMiddleware } from '../../auth/auth.middleware'
import { adminOnly } from '../adminOnly'

const router = Router()

// 🔐 Proteção local (não depender apenas do main.ts)
router.use(authMiddleware, adminOnly)

// ================= LIST (UI) =================
router.get('/', AdminWithdrawalsController.list)

// ================= EXPORT (PDF / CSV) =================
// Ex: /admin/withdrawals/export
// Ex: /admin/withdrawals/export?status=SUCCESS
router.get('/export', AdminWithdrawalsController.export)

// ================= APPROVE =================
router.patch('/:id/approve', AdminWithdrawalsController.approve)

// ================= REJECT =================
router.patch('/:id/reject', AdminWithdrawalsController.reject)

export default router
