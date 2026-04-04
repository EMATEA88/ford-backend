import { Request, Response } from 'express'
import { ServiceService } from './service.service'

export class ServiceController {

  // =============================
  // LIST PARTNERS
  // =============================
  static async partners(req: Request, res: Response) {
    try {

      const data = await ServiceService.listPartners()

      return res.status(200).json(data)

    } catch (error: any) {

      return res.status(500).json({
        error: 'FAILED_TO_FETCH_PARTNERS'
      })
    }
  }

  // =============================
  // LIST PLANS BY PARTNER
  // =============================
  static async plans(req: Request, res: Response) {
    try {

      const partnerId = Number(req.params.id)

      if (!partnerId || isNaN(partnerId)) {
        return res.status(400).json({
          error: 'INVALID_PARTNER_ID'
        })
      }

      const data =
        await ServiceService.listPlansByPartner(partnerId)

      return res.status(200).json(data)

    } catch (error: any) {

      return res.status(500).json({
        error: 'FAILED_TO_FETCH_PLANS'
      })
    }
  }

  // =============================
  // USER REQUEST HISTORY
  // =============================
  static async myRequests(req: Request, res: Response) {
    try {

      const userId = Number((req as any).userId)

      if (!userId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED'
        })
      }

      const data =
        await ServiceService.getUserRequests(userId)

      return res.status(200).json(data)

    } catch (error: any) {

      return res.status(500).json({
        error: 'FAILED_TO_FETCH_REQUESTS'
      })
    }
  }

  // =============================
  // PROCESS PAYMENT
  // =============================
  static async pay(req: Request, res: Response) {
    try {

      const userId = Number((req as any).userId)
      const planId = Number(req.body.planId)

      if (!userId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED'
        })
      }

      if (!planId || isNaN(planId)) {
        return res.status(400).json({
          error: 'INVALID_PLAN_ID'
        })
      }

      const result =
        await ServiceService.processServicePayment(
          userId,
          planId
        )

      return res.status(201).json(result)

    } catch (error: any) {

      return res.status(400).json({
        error: error.message || 'SERVICE_PAYMENT_FAILED'
      })
    }
  }

}
