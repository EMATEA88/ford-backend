import { Router } from 'express'
import { authMiddleware } from '../../auth/auth.middleware'
import { adminOnly } from '../adminOnly'
import { GiftAdminController } from './admin.gift.controller'

const router = Router()

/*
|--------------------------------------------------------------------------
| 🔐 ADMIN ONLY ROUTES
|--------------------------------------------------------------------------
| Todas as rotas exigem:
| - Token válido
| - Role ADMIN
|--------------------------------------------------------------------------
*/

// =========================
// LISTAR (PAGINADO)
// GET /admin/gifts
// =========================
router.get(
  '/',
  authMiddleware,
  adminOnly,
  GiftAdminController.list
)

// =========================
// CRIAR CÓDIGO ÚNICO
// POST /admin/gifts
// =========================
router.post(
  '/',
  authMiddleware,
  adminOnly,
  GiftAdminController.create
)

// =========================
// CRIAR LOTE
// POST /admin/gifts/batch
// =========================
router.post(
  '/batch',
  authMiddleware,
  adminOnly,
  GiftAdminController.createBatch
)

// =========================
// DESATIVAR
// PATCH /admin/gifts/:id/disable
// =========================
router.patch(
  '/:id/disable',
  authMiddleware,
  adminOnly,
  GiftAdminController.disable
)

export default router
