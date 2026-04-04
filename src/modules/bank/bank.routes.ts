import { Router } from 'express'
import { authMiddleware } from '../auth/auth.middleware'
import { BankController } from './bank.controller'

const router = Router()

router.get('/', authMiddleware, BankController.list)

export const bankRoutes = router
