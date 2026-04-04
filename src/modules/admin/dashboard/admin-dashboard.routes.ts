import { Router } from 'express'
import { AdminDashboardController } from './admin-dashboard.controller'
import { authMiddleware } from '../../auth/auth.middleware'

const router = Router()

// GET /admin/dashboard
router.get(
  '/',
  authMiddleware,
  AdminDashboardController.summary
)

export default router