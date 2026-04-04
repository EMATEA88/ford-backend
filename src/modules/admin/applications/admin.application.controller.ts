import { Request, Response } from 'express'
import { AdminApplicationService } from './admin.application.service'

export class AdminApplicationController {

  static async list(req: Request, res: Response) {
    try {

      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 20
      const status = req.query.status as any

      const result =
        await AdminApplicationService.list(
          page,
          limit,
          status
        )

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }

  static async details(req: Request, res: Response) {
    try {

      const id = Number(req.params.id)

      const result =
        await AdminApplicationService.details(id)

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }

  static async stats(req: Request, res: Response) {
    try {

      const result =
        await AdminApplicationService.stats()

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }

  static async cancel(req: Request, res: Response) {
    try {

      const id = Number(req.params.id)
      const adminId = (req as any).userId

      const result =
        await AdminApplicationService.cancel(
          id,
          adminId
        )

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({ error: error.message })
    }
  }
}