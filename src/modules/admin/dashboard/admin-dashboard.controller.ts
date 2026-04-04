import { Request, Response } from 'express'
import { AdminDashboardService } from './admin-dashboard.service'

export class AdminDashboardController {

  static async summary(req: Request, res: Response) {

    try {

      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden' })
      }

      const data = await AdminDashboardService.summary()

      return res.status(200).json(data)

    } catch (error) {

      console.error('[ADMIN_DASHBOARD_ERROR]', error)

      return res.status(500).json({
        message: 'Internal server error'
      })
    }
  }
}