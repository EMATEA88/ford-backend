import { Router } from 'express'
import { ApplicationController } from './application.controller'
import { authMiddleware } from '../../modules/auth/auth.middleware'

const router = Router()

router.post(
  '/',
  authMiddleware,
  ApplicationController.create
)

router.get(
  '/',
  authMiddleware,
  ApplicationController.list
)

export default router