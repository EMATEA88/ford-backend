import { Router } from 'express'
import { AdminUsersController } from './admin.users.controller'

const router = Router()

// ================= LIST =================
router.get('/', AdminUsersController.list)

// ================= DETAIL =================
router.get('/:id', AdminUsersController.detail)

// ================= ROLE =================
router.patch('/:id/role', AdminUsersController.updateRole)

// ================= BLOCK =================
router.patch('/:id/block', AdminUsersController.block)
router.patch('/:id/unblock', AdminUsersController.unblock)

// ================= BALANCE =================
router.patch('/:id/balance', AdminUsersController.adjustBalance)

export default router
