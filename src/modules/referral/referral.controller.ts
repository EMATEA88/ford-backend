import { Request, Response } from 'express'
import { ReferralService } from './referral.service'

export class ReferralController {
  static async myTeam(req: Request, res: Response) {
    try {

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'UNAUTHORIZED'
        })
      }

      const userId = req.user.id

      const data = await ReferralService.getMyTeam(userId)

      return res.json({
        success: true,
        data
      })

    } catch (error) {

      console.error('REFERRAL ERROR 👉', error)

      return res.status(500).json({
        success: false,
        message: 'FAILED_TO_LOAD_TEAM'
      })
    }
  }
}