import { Request, Response } from "express"
import { AdminKYCService } from "./admin.kyc.service"

export class AdminKYCController {

  static async list(req: Request, res: Response) {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20

    const result = await AdminKYCService.list(page, limit)
    return res.json(result)
  }

  static async approve(req: Request, res: Response) {
    const userId = Number(req.params.userId)
    const adminId = (req as any).userId

    const result =
      await AdminKYCService.approve(userId, adminId)

    return res.json(result)
  }

  static async reject(req: Request, res: Response) {
    const userId = Number(req.params.userId)
    const adminId = (req as any).userId
    const { reason } = req.body

    const result =
      await AdminKYCService.reject(userId, adminId, reason)

    return res.json(result)
  }
}
