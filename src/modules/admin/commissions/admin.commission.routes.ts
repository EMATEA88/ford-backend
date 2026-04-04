import { Router } from 'express'
import { AdminCommissionController } from './admin.commission.controller'

const router = Router()

router.get('/', AdminCommissionController.list)

export default router
