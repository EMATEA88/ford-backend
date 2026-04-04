import { Request, Response } from 'express'
import { AdminRevenueService } from './admin.revenue.service'

export class AdminRevenueController {

  static async list(req: Request, res: Response) {
    try {

      const result =
        await AdminRevenueService.list(req.query)

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({
        error: error.message
      })
    }
  }

  static async stats(req: Request, res: Response) {
    try {

      const result =
        await AdminRevenueService.stats()

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({
        error: error.message
      })
    }
  }

  static async monthly(req: Request, res: Response) {
    try {

      const year =
        Number(req.query.year) || new Date().getFullYear()

      const result =
        await AdminRevenueService.monthly(year)

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({
        error: error.message
      })
    }
  }
}
