import { Router } from 'express'
import { SupportController } from './support.controller'
import { authMiddleware } from '../../modules/auth/auth.middleware'
import { adminMiddleware } from '../../modules/admin/admin.middleware'

const router = Router()

// USER
router.post('/open', authMiddleware, SupportController.open)
router.get('/:orderId', authMiddleware, SupportController.get)
router.post('/send', authMiddleware, SupportController.send)

// ADMIN
router.get('/admin/list', authMiddleware, adminMiddleware, SupportController.list)
router.post('/admin/send', authMiddleware, adminMiddleware, SupportController.adminSend)
router.patch('/admin/:orderId/close', authMiddleware, adminMiddleware, SupportController.close)

export default router
