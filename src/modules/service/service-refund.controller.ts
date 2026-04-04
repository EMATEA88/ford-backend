import { Request, Response } from 'express'
import { ServiceRefundService } from './service-refund.service'

export class ServiceRefundController {

  static async cancel(req: Request, res: Response) {

    try {

      const requestId = Number(req.params.id)
      const adminId = (req as any).userId

      if (!adminId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED'
        })
      }

      if (!requestId || isNaN(requestId)) {
        return res.status(400).json({
          error: 'INVALID_ID'
        })
      }

      const result =
        await ServiceRefundService.cancelAndRefund(
          requestId,
          adminId
        )

      return res.json(result)

    } catch (error: any) {

      return res.status(400).json({
        error: error.message || 'REFUND_FAILED'
      })
    }
  }
}
