import { Router } from 'express'
import { AdminLogController } from './admin-log.controller'

const router = Router()

router.get('/', AdminLogController.list)

export const adminLogRoutes = router