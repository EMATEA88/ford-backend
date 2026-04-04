import { Request, Response } from "express"
import { UserOTCService } from "./user.otc.service"

export class UserOTCController {

  /* ================= ASSETS ================= */
  static async assets(req: Request, res: Response) {
    try {
      const data = await UserOTCService.listAssets()
      return res.json({ success: true, data })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }

  /* ================= CREATE ORDER ================= */
static async create(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "UNAUTHORIZED"
      })
    }

    const { assetId, type, quantity } = req.body

    if (!assetId || !type || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "INVALID_PAYLOAD"
      })
    }

    const order = await UserOTCService.createOrder(
      req.user.id,
      Number(assetId),
      type,
      Number(quantity)
    )

    return res.status(201).json({
      success: true,
      data: order
    })

  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

  /* ================= GET ORDER ================= */
static async getOne(req: Request, res: Response) {
  try {
    const userId = (req as any).userId
    const orderId = Number(req.params.id)

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "INVALID_ORDER_ID"
      })
    }

    const order = await UserOTCService.getOrderById(userId, orderId)

    return res.json({ success: true, data: order })

  } catch (error: any) {
    console.error("GET ONE ERROR:", error)
    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

  /* ================= MY ORDERS ================= */
  static async myOrders(req: Request, res: Response) {
    try {
      const userId = (req as any).userId
      const orders = await UserOTCService.myOrders(userId)
      return res.json({ success: true, data: orders })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }

  /* ================= MARK AS PAID ================= */
  static async markAsPaid(req: Request, res: Response) {
    try {
      const userId = (req as any).userId
      const orderId = Number(req.params.id)

      const result = await UserOTCService.markAsPaid(userId, orderId)

      return res.json({ success: true, data: result })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }

  /* ================= DISPUTE ================= */
  static async dispute(req: Request, res: Response) {
    try {
      const userId = (req as any).userId
      const orderId = Number(req.params.id)

      const result = await UserOTCService.openDispute(userId, orderId)

      return res.json({ success: true, data: result })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }

  /* ================= CANCEL ================= */
  static async cancel(req: Request, res: Response) {
    try {
      const userId = (req as any).userId
      const orderId = Number(req.params.id)

      const result = await UserOTCService.cancelOrder(userId, orderId)

      return res.json({ success: true, data: result })
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }

  /* ================= UPLOAD IMAGE ================= */
  static async uploadImage(req: Request, res: Response) {
    try {
      const userId = (req as any).userId
      const orderId = Number(req.params.orderId)

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "NO_FILE"
        })
      }

      const message = await UserOTCService.uploadImage(
        userId,
        orderId,
        req.file
      )

      return res.status(201).json({
        success: true,
        data: message
      })

    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
  }
}