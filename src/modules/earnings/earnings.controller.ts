import { Request, Response } from 'express'
import { EarningsService } from './earnings.service'

export class EarningsController {

  static async get(req: Request, res: Response) {
    if (!req.user) {
  throw new Error('UNAUTHORIZED')
}

const userId = req.user.id

    const data = await EarningsService.get(userId)

    return res.json({
      success: true,
      data
    })
  }
}