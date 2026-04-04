import { Request, Response } from 'express'
import { AdminPartnerService } from './admin.partner.service'

export class AdminPartnerController {

  static async list(req: Request, res: Response) {
    const data = await AdminPartnerService.listPartners()
    res.json(data)
  }

  static async generate(req: Request, res: Response) {
    const partnerId = Number(req.params.id)
    const data = await AdminPartnerService.generateSettlement(partnerId)
    res.json(data)
  }

  static async settlements(req: Request, res: Response) {
    const partnerId = Number(req.params.id)
    const data = await AdminPartnerService.getSettlements(partnerId)
    res.json(data)
  }

  static async pay(req: Request, res: Response) {
    const settlementId = Number(req.params.id)
    const data = await AdminPartnerService.markAsPaid(settlementId)
    res.json(data)
  }
}