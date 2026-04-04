import { Router } from 'express'
import { AdminTransactionsController } from './admin.transactions.controller'
import { adminOnly } from '../../admin/adminOnly'

const router = Router()

router.get('/', adminOnly, AdminTransactionsController.list)

export default router
