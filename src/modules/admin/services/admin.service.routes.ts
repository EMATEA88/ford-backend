import { Router } from 'express'
import { authMiddleware } from '../../auth/auth.middleware'
import { adminMiddleware } from '../admin.middleware'
import { AdminServiceController } from './admin.service.controller'

const router = Router()

// =============================
// 🔐 ADMIN PROTECTION
// =============================
router.use(authMiddleware, adminMiddleware)

// =============================
// LIST SERVICE REQUESTS
// GET /admin/services
// =============================
router.get(
  '/',
  AdminServiceController.list
)

// =============================
// COMPLETE SERVICE REQUEST
// PATCH /admin/services/:id/complete
// =============================
router.patch(
  '/:id/complete',
  AdminServiceController.complete
)

export const adminServiceRoutes = router
