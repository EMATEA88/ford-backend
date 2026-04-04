import { Request, Response } from "express"
import { AdminOTCService } from "./admin.otc.service"
import { OrderStatus, OrderType, SupportMessageType } from "@prisma/client"

export class AdminOTCController {

  /* ================= GET ONE ================= */
  static async getOne(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)

      if (!id || id <= 0)
        return res.status(400).json({ error: "INVALID_ORDER_ID" })

      const data = await AdminOTCService.getOne(id)

      if (!data)
        return res.status(404).json({ error: "ORDER_NOT_FOUND" })

      return res.json(data)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  /* ================= LIST ================= */
  static async list(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1)
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))

      const statusRaw = req.query.status as string | undefined
      const typeRaw = req.query.type as string | undefined

      let status: OrderStatus | undefined
      let type: OrderType | undefined

      if (statusRaw) {
        if (!Object.values(OrderStatus).includes(statusRaw as OrderStatus))
          return res.status(400).json({ error: "INVALID_STATUS" })
        status = statusRaw as OrderStatus
      }

      if (typeRaw) {
        if (!Object.values(OrderType).includes(typeRaw as OrderType))
          return res.status(400).json({ error: "INVALID_TYPE" })
        type = typeRaw as OrderType
      }

      const data = await AdminOTCService.list(page, limit, status, type)
      return res.json(data)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  /* ================= RELEASE ================= */
  static async release(req: Request, res: Response) {
    try {
      const orderId = Number(req.params.id)
      const adminId = (req as any).userId

      const result = await AdminOTCService.release(orderId, adminId)
      return res.json(result)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  /* ================= CANCEL ================= */
  static async cancel(req: Request, res: Response) {
    try {
      const orderId = Number(req.params.id)

      const result = await AdminOTCService.cancel(orderId)
      return res.json(result)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  /* ================= SEND MESSAGE ================= */
  static async sendMessage(req: Request, res: Response) {
    try {
      const orderId = Number(req.params.orderId)
      const { content, type } = req.body
      const adminId = (req as any).userId

      if (!content)
        return res.status(400).json({ error: "EMPTY_MESSAGE" })

      const result = await AdminOTCService.sendMessage(
        orderId,
        adminId,
        content,
        type as SupportMessageType
      )

      return res.json(result)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  /* ================= UPLOAD IMAGE ================= */
  static async uploadImage(req: Request, res: Response) {
    try {
      const orderId = Number(req.params.orderId)
      const adminId = (req as any).userId

      if (!req.file)
        return res.status(400).json({ error: "NO_FILE" })

      const result = await AdminOTCService.uploadImage(
        orderId,
        adminId,
        req.file
      )

      return res.status(201).json(result)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  /* ================= STATS ================= */
  static async stats(_req: Request, res: Response) {
    const data = await AdminOTCService.stats()
    return res.json(data)
  }

  static async financialSummary(_req: Request, res: Response) {
    const data = await AdminOTCService.financialSummary()
    return res.json(data)
  }

  /* ================= ASSETS ================= */
  static async assets(_req: Request, res: Response) {
    const data = await AdminOTCService.listAssets()
    return res.json(data)
  }

  static async updateAsset(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      const { buyPrice, sellPrice } = req.body
      const adminId = (req as any).userId

      const result = await AdminOTCService.updateAsset(
        id,
        Number(buyPrice),
        Number(sellPrice),
        adminId
      )

      return res.json(result)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  /* ================= AUDIT ================= */
  static async audit(req: Request, res: Response) {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const data = await AdminOTCService.audit(page, limit)
    return res.json(data)
  }

  /* ================= PRICE HISTORY ================= */
  static async priceHistory(req: Request, res: Response) {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const data = await AdminOTCService.priceHistory(page, limit)
    return res.json(data)
  }
}