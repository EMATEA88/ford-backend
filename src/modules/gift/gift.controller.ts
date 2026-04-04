import { Request, Response } from 'express'
import { GiftService } from './gift.service'

export class GiftController {

  static async generate(req: Request, res: Response) {

  const adminId = (req as any).userId
  const { amount, expiresInDays, quantity } = req.body

  try {

    const gifts = await GiftService.generate(
      adminId,
      Number(amount),
      Number(expiresInDays),
      Number(quantity || 1)
    )

    return res.json({
      success: true,
      gifts
    })

  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
}

  static async redeem(req: Request, res: Response) {

    const userId = (req as any).userId
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'INVALID_CODE' })
    }

    try {

      const result = await GiftService.redeem(
        userId,
        code.trim().toUpperCase()
      )

      res.json(result)

    } catch (err: any) {

      res.status(400).json({
        error: err.message
      })

    }
  }
}