import { Request, Response } from 'express'
import { TransactionService } from './transaction.service'

export class TransactionController {

  static async list(req: Request, res: Response) {

    try {

      const userId = (req as any).userId

      if (!userId)
        return res.status(401).json({
          error: 'UNAUTHORIZED'
        })

      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 20

      const data = await TransactionService.listByUser(
        userId,
        page,
        limit
      )

      return res.json(data)

    } catch (error: any) {

      return res.status(400).json({
        error: error.message || 'TRANSACTION_ERROR'
      })
    }
  }
}