import { Router } from 'express'
import { authMiddleware } from '../../modules/auth/auth.middleware'
import { TransactionController } from './transaction.controller'

const router = Router()

router.get(
  '/',
  authMiddleware,
  TransactionController.list
)

export default router
