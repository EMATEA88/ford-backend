import { Router } from 'express'
import { ReferralController } from './referral.controller'
import { authMiddleware } from '../auth/auth.middleware'

const router = Router()

router.get('/team', authMiddleware, ReferralController.myTeam)

export default router