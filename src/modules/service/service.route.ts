import { Router } from 'express'
import { ServiceController } from './service.controller'
import { authMiddleware } from '../auth/auth.middleware'

const router = Router()

// =============================
// PUBLIC (AUTH REQUIRED)
// =============================

// Listar parceiros ativos
router.get(
  '/partners',
  authMiddleware,
  ServiceController.partners
)

// Listar planos por parceiro
router.get(
  '/partners/:id/plans',
  authMiddleware,
  ServiceController.plans
)

// Histórico do usuário
router.get(
  '/my-requests',
  authMiddleware,
  ServiceController.myRequests
)

// Processar pagamento de serviço
router.post(
  '/pay',
  authMiddleware,
  ServiceController.pay
)

export const serviceRoutes = router
