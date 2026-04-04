import { Request, Response } from 'express'
import { AdminFinanceService } from './admin-finance.service'

export class AdminFinanceController {

  static async overview(req: Request, res: Response) {
    try {

      const data = await AdminFinanceService.getFinancialOverview()

      return res.json(data)

    } catch (error: any) {
      return res.status(400).json({
        message: error.message
      })
    }
  }

}
