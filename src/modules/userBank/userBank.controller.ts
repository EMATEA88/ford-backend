import { Request, Response } from 'express'
import { UserBankService } from './userBank.service'

export class UserBankController {

  static async get(req: Request, res: Response) {

    const userId = (req as any).userId

    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED' })
    }

    try {
      const data = await UserBankService.get(userId)
      return res.json(data)
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'FAILED_TO_FETCH_BANK'
      })
    }
  }

  static async save(req: Request, res: Response) {

    const userId = (req as any).userId

    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED' })
    }

    try {

      const result = await UserBankService.save(userId, req.body)

      return res.json(result)

    } catch (error: any) {

      return res.status(400).json({
        error: error.message || 'INVALID_BANK_DATA'
      })
    }
  }
}