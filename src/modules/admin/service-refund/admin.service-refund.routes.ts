import { Router } from 'express'
import { authMiddleware } from '../../auth/auth.middleware'
import { adminOnly } from '../adminOnly'
import { AdminServiceRefundController } from './admin.service-refund.controller'

const router = Router()

router.use(authMiddleware, adminOnly)

router.get('/', AdminServiceRefundController.list)
router.get('/stats', AdminServiceRefundController.stats)
router.patch('/:id/refund', AdminServiceRefundController.refund)

export const adminServiceRefundRoutes = router
