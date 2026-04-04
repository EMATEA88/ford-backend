import { Router } from 'express'
import { authMiddleware } from '../../auth/auth.middleware'
import { adminOnly } from '../adminOnly'
import { AdminRevenueController } from './admin.revenue.controller'

const router = Router()

router.use(authMiddleware, adminOnly)

router.get('/', AdminRevenueController.list)
router.get('/stats', AdminRevenueController.stats)
router.get('/monthly', AdminRevenueController.monthly)

export const adminRevenueRoutes = router
