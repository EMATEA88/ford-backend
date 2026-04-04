import { Router } from 'express'
import { StoreController } from './store.controller'
import { authMiddleware } from '../auth/auth.middleware'

const router = Router()

router.get('/', authMiddleware, StoreController.myStore)
router.get('/summary', authMiddleware, StoreController.summary)

export default router