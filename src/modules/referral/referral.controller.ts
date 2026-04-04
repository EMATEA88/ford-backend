import { Request, Response } from 'express'
import { ReferralService } from './referral.service'

export class ReferralController {
  static async myTeam(req: Request, res: Response) {
    if (!req.user) {
  throw new Error('UNAUTHORIZED')
}

const userId = req.user.id

    const data = await ReferralService.getMyTeam(userId)

    return res.json({
      success: true,
      data
    })
  }
}