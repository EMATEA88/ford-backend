import { Router } from 'express'
import { TaskController } from './task.controller'
import { authMiddleware } from '../auth/auth.middleware'

const router = Router()

router.post('/complete', authMiddleware, TaskController.complete)
router.get('/status', authMiddleware, TaskController.status)
router.get('/history', authMiddleware, TaskController.history)

export default router