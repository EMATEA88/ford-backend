import { Request, Response } from 'express'
import { StoreService } from './store.service'

export class StoreController {

  static async myStore(req: Request, res: Response) {
    if (!req.user) {
  throw new Error('UNAUTHORIZED')
}

const userId = req.user.id
    const status = (req.query.status as any) || 'all'

    const data = await StoreService.myStore(userId, status)

    return res.json({ success: true, data })
  }

  static async summary(req: Request, res: Response) {
    if (!req.user) {
  throw new Error('UNAUTHORIZED')
}

const userId = req.user.id
    const data = await StoreService.summary(userId)

    return res.json({ success: true, data })
  }
}