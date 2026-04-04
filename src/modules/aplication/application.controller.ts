import { Request, Response } from 'express'
import { ApplicationService } from './application.service'

export class ApplicationController {

  /* =========================
     CREATE
  ========================= */

  static async create(req: Request, res: Response) {
    try {

      const userId = (req as any).userId
      const { amount, periodDays } = req.body

      const result = await ApplicationService.create(
        userId,
        Number(amount),
        Number(periodDays)
      )

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }

  /* =========================
     LIST USER APPLICATIONS
  ========================= */

  static async list(req: Request, res: Response) {
    try {

      const userId = (req as any).userId

      const data = await ApplicationService.listByUser(userId)

      return res.json(data)

    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }
}