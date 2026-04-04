import { Router } from 'express'
import { authMiddleware } from '../auth/auth.middleware'
import { adminOnly } from '../admin/adminOnly'
import { ServiceRefundController } from './service-refund.controller'

const router = Router()

// 🔐 Proteção padrão do sistema
router.use(authMiddleware, adminOnly)

// =============================
// CANCELAR E REEMBOLSAR SERVIÇO
// =============================
router.patch('/:id/cancel', ServiceRefundController.cancel)

export const serviceRefundRoutes = router
