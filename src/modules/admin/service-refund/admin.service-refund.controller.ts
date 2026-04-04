import { Request, Response } from 'express'
import { AdminServiceRefundService } from './admin.service-refund.service'

export class AdminServiceRefundController {

  static async list(req: Request, res: Response) {
    try {

      const { status } = req.query

      const result =
        await AdminServiceRefundService.list(
          status as any
        )

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
        await AdminServiceRefundService.stats()

      return res.json(result)

    } catch (error: any) {

      return res.status(400).json({
        error: error.message
      })
    }
  }

  static async refund(req: Request, res: Response) {
    try {

      const id = Number(req.params.id)
      const adminId = (req as any).userId

      if (!adminId)
        return res.status(401).json({
          error: 'UNAUTHORIZED'
        })

      if (!id || isNaN(id))
        return res.status(400).json({
          error: 'INVALID_ID'
        })

      const result =
        await AdminServiceRefundService.refund(
          id,
          adminId
        )

      return res.json(result)

    } catch (error: any) {

      return res.status(400).json({
        error: error.message
      })
    }
  }

}
