import { Request, Response } from "express"
import { AdminSettlementService } from "./admin.settlement.service"

export class AdminSettlementController {

  static async list(req: Request, res: Response) {
    try {
      const result = await AdminSettlementService.list(req.query)
      return res.json(result)
    } catch (error: any) {
      return res.status(400).json({ message: error.message })
    }
  }

  static async details(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)

      if (!id)
        return res.status(400).json({ message: "INVALID_ID" })

      const result = await AdminSettlementService.details(id)
      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({ message: error.message })
    }
  }

  static async stats(req: Request, res: Response) {
    try {
      const result = await AdminSettlementService.stats()
      return res.json(result)
    } catch (error: any) {
      return res.status(400).json({ message: error.message })
    }
  }

  static async settle(req: Request, res: Response) {
    try {

      const id = Number(req.params.id)
      const adminId = (req as any).userId

      if (!id)
        return res.status(400).json({ message: "INVALID_ID" })

      if (!adminId)
        return res.status(401).json({ message: "UNAUTHORIZED" })

      const result = await AdminSettlementService.settle(id, adminId)

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({ message: error.message })
    }
  }

}
