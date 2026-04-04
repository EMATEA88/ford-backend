import { Router } from 'express'
import { authMiddleware } from '../auth/auth.middleware'
import { UserController } from './user.controller'

const router = Router()

router.get('/me', authMiddleware, UserController.me)

export const userRoutes = router
