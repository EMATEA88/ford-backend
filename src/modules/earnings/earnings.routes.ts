import { Router } from 'express'
import { EarningsController } from './earnings.controller'
import { authMiddleware } from '../auth/auth.middleware'

const router = Router()

router.get('/', authMiddleware, EarningsController.get)

export default router