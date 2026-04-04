import { Request, Response } from "express"
import { OTCChatService } from "./otc.chat.service"

export class OTCChatController {

  static async get(req: Request, res: Response) {
    try {
      const userId = (req as any).userId
      const orderId = Number(req.params.orderId)

      if (!orderId) {
        return res.status(400).json({ message: "Invalid orderId" })
      }

      const data = await OTCChatService.getByOrder(
        userId,
        orderId
      )

      return res.json(data)

    } catch (error: any) {
      return res.status(400).json({
        message: error.message
      })
    }
  }

  static async send(req: Request, res: Response) {
    try {
      const userId = (req as any).userId
      const orderId = Number(req.params.orderId)
      const { content } = req.body

      if (!content) {
        return res.status(400).json({
          message: "Message content required"
        })
      }

      const message =
        await OTCChatService.sendMessage(
          userId,
          orderId,
          content
        )

      return res.status(201).json(message)

    } catch (error: any) {
      return res.status(400).json({
        message: error.message
      })
    }
  }
}