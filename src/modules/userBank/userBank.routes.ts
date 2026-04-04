import { Router } from 'express';
import { authMiddleware } from '../auth/auth.middleware';
import { UserBankController } from './userBank.controller';

const router = Router();
router.get('/', authMiddleware, UserBankController.get);
router.post('/', authMiddleware, UserBankController.save);
export default router;
