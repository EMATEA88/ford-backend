import { Request, Response } from 'express'
import { SettlementService } from './settlement.service'

export class SettlementController {

  static async settle(req: Request, res: Response) {
    try {

      const settlementId = Number(req.params.id)
      const adminId = (req as any).userId

      if (!settlementId || settlementId <= 0)
        return res.status(400).json({ message: 'INVALID_ID' })

      if (!adminId)
        return res.status(401).json({ message: 'UNAUTHORIZED' })

      const result = await SettlementService.settlePartner(
        settlementId,
        adminId
      )

      return res.json(result)

    } catch (error: any) {

      return res.status(400).json({
        message: error.message
      })
    }
  }
}
