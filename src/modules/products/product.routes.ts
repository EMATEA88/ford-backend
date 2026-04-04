import { Router } from 'express'
import { ProductController } from './product.controller'
import { authMiddleware } from '../auth/auth.middleware'

const router = Router()

// 🔥 ORDEM IMPORTA
router.post('/purchase', authMiddleware, ProductController.purchase)
router.get('/my/list', authMiddleware, ProductController.myProducts)

router.get('/', ProductController.list)
router.get('/:id', ProductController.detail)

export default router