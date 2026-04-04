import { Router } from 'express'
import { authMiddleware } from '../auth/auth.middleware'
import { adminMiddleware } from '../../modules/admin/admin.middleware'
import { SettlementController } from './settlement.controller'

const router = Router()

router.patch(
  '/:id/settle',
  authMiddleware,
  adminMiddleware,
  SettlementController.settle
)

export const settlementRoutes = router
