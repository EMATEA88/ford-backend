import { Router } from 'express'
import { AdminFinanceController } from './admin-finance.controller'

const router = Router()

router.get('/overview', AdminFinanceController.overview)

export const adminFinanceRoutes = router
