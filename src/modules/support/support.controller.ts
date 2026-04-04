import { Request, Response } from 'express'
import { SupportService } from './support.service'
import { SupportMessageType } from '@prisma/client'

export class SupportController {

  static async open(req: Request, res: Response) {
    const userId = (req as any).userId
    const { orderId } = req.body

    const conversation =
      await SupportService.openConversation(
        Number(orderId),
        userId
      )

    res.json(conversation)
  }

  static async send(req: Request, res: Response) {
    const userId = (req as any).userId
    const { orderId, type, content } = req.body

    const message =
      await SupportService.sendMessage({
        orderId: Number(orderId),
        senderId: userId,
        isAdmin: false,
        type: type as SupportMessageType,
        content
      })

    res.json(message)
  }

  static async adminSend(req: Request, res: Response) {
    const adminId = (req as any).userId
    const { orderId, type, content } = req.body

    const message =
      await SupportService.sendMessage({
        orderId: Number(orderId),
        senderId: adminId,
        isAdmin: true,
        type: type as SupportMessageType,
        content
      })

    res.json(message)
  }

  static async get(req: Request, res: Response) {
    const userId = (req as any).userId
    const orderId = Number(req.params.orderId)

    const conversation =
      await SupportService.getConversation(orderId, userId)

    res.json(conversation)
  }

  static async list(req: Request, res: Response) {
    const conversations =
      await SupportService.listAllConversations()

    res.json(conversations)
  }

  static async close(req: Request, res: Response) {
    const orderId = Number(req.params.orderId)

    await SupportService.closeConversation(orderId)

    res.json({ success: true })
  }
}
