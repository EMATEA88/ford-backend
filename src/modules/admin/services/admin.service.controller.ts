import { Request, Response } from 'express'
import { AdminServiceService } from './admin.service.service'

export class AdminServiceController {

  // =============================
  // LIST SERVICE REQUESTS (ADMIN)
  // =============================
  static async list(req: Request, res: Response) {
    try {

      const status = typeof req.query.status === 'string'
        ? req.query.status
        : undefined

      const page = typeof req.query.page === 'string'
        ? Number(req.query.page)
        : undefined

      const limit = typeof req.query.limit === 'string'
        ? Number(req.query.limit)
        : undefined

      const result =
        await AdminServiceService.list({
          status,
          page,
          limit
        })

      return res.status(200).json(result)

    } catch (error: any) {

      return res.status(500).json({
        error: error.message || 'FAILED_TO_FETCH_SERVICE_REQUESTS'
      })
    }
  }

  // =============================
  // COMPLETE REQUEST (ADMIN)
  // =============================
  static async complete(req: Request, res: Response) {
    try {

      const id = Number(req.params.id)
      const adminId = Number((req as any).userId)

      if (!id || isNaN(id) || id <= 0) {
        return res.status(400).json({
          error: 'INVALID_ID'
        })
      }

      if (!adminId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED'
        })
      }

      const result =
        await AdminServiceService.complete(
          id,
          adminId
        )

      return res.status(200).json(result)

    } catch (error: any) {

      return res.status(400).json({
        error: error.message || 'SERVICE_COMPLETE_FAILED'
      })
    }
  }

}
