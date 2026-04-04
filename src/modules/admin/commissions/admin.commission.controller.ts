import { Request, Response } from 'express'
import { AdminCommissionService } from './admin.commission.service'

export class AdminCommissionController {

  static async list(req: Request, res: Response) {

    try {

      const page = Number(req.query.page || 1)
      const limit = Number(req.query.limit || 20)

      const data = await AdminCommissionService.list(page, limit)

      return res.json(data)

    } catch (error: any) {

      return res.status(500).json({
        error: 'INTERNAL_ERROR'
      })

    }

  }

}