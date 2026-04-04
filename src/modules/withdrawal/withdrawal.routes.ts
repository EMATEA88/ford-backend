import { Router } from 'express'
import { authMiddleware } from '../auth/auth.middleware'
import { WithdrawalController } from './withdrawal.controller'

const router = Router()

/**
 * User creates withdrawal request
 */
router.get('/', WithdrawalController.list)
router.post('/', WithdrawalController.create)

export const withdrawalRoutes = router