import { Request, Response } from 'express'
import { RechargeService } from './recharge.service'

export class RechargeController {

  /**
   * Usuário cria pedido de recarga
   */
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).userId
      const { amount } = req.body

      if (!userId) {
        return res.status(401).json({ message: 'UNAUTHORIZED' })
      }

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: 'INVALID_AMOUNT' })
      }

      const recharge = await RechargeService.create(
        userId,
        Number(amount)
      )

      return res.status(201).json(recharge)

    } catch (error: any) {
      return res.status(400).json({
        message: error.message
      })
    }
  }

  /**
   * Histórico do próprio usuário
   */
  static async myHistory(req: Request, res: Response) {
    try {
      const userId = (req as any).userId

      if (!userId) {
        return res.status(401).json({ message: 'UNAUTHORIZED' })
      }

      const history = await RechargeService.listByUser(userId)

      return res.json(history)

    } catch (error: any) {
      return res.status(400).json({
        message: error.message
      })
    }
  }

  /**
   * Admin aprova recarga
   */
  static async approve(req: Request, res: Response) {
    try {
      const rechargeId = Number(req.params.id)
      const adminId = (req as any).userId

      if (!rechargeId) {
        return res.status(400).json({ message: 'INVALID_ID' })
      }

      if (!adminId) {
        return res.status(401).json({ message: 'UNAUTHORIZED' })
      }

      const result = await RechargeService.approve(
        rechargeId,
        adminId
      )

      return res.json(result)

    } catch (error: any) {
      return res.status(400).json({
        message: error.message
      })
    }
  }
}
