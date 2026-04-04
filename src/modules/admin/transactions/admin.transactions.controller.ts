import { Request, Response } from 'express'
import { AdminTransactionsService } from './admin.transactions.service'
import { TransactionType } from '@prisma/client'

export class AdminTransactionsController {
  static async list(req: Request, res: Response) {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const type = req.query.type as TransactionType | undefined
    const userId = req.query.userId ? Number(req.query.userId) : undefined

    const data = await AdminTransactionsService.list(
      page,
      limit,
      type,
      userId
    )

    return res.json(data)
  }
}
