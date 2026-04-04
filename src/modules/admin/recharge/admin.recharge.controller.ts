import { Request, Response } from 'express'
import { AdminRechargeService } from './admin.recharges.service'

export class AdminRechargeController {

  /* =========================
     LIST
  ========================= */

  static async list(_req: Request, res: Response) {
    try {

      const data = await AdminRechargeService.list()

      return res.status(200).json(data)

    } catch (error) {

      console.error('[ADMIN_RECHARGE_LIST_ERROR]', error)

      return res.status(500).json({
        error: 'INTERNAL_ERROR'
      })
    }
  }

  /* =========================
     APPROVE
  ========================= */

  static async approve(req: Request, res: Response) {

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'INVALID_RECHARGE_ID'
      })
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'UNAUTHORIZED'
      })
    }

    const adminId = req.user.id

    try {

      const data = await AdminRechargeService.approve(id, adminId)

      return res.status(200).json(data)

    } catch (error: any) {

      if (error.message === 'RECHARGE_NOT_FOUND') {
        return res.status(404).json({ error: 'RECHARGE_NOT_FOUND' })
      }

      if (error.message === 'ALREADY_PROCESSED') {
        return res.status(409).json({ error: 'ALREADY_PROCESSED' })
      }

      if (error.message === 'USER_BLOCKED') {
        return res.status(403).json({ error: 'USER_BLOCKED' })
      }

      if (error.message === 'INVALID_RECHARGE_ID') {
        return res.status(400).json({ error: 'INVALID_RECHARGE_ID' })
      }

      if (error.message === 'INVALID_ADMIN') {
        return res.status(403).json({ error: 'INVALID_ADMIN' })
      }

      console.error('[ADMIN_RECHARGE_APPROVE_ERROR]', error)

      return res.status(500).json({
        error: 'INTERNAL_ERROR'
      })
    }
  }

  /* =========================
     REJECT
  ========================= */

  static async reject(req: Request, res: Response) {

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'INVALID_RECHARGE_ID'
      })
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'UNAUTHORIZED'
      })
    }

    const adminId = req.user.id

    try {

      const data = await AdminRechargeService.reject(id, adminId)

      return res.status(200).json(data)

    } catch (error: any) {

      if (error.message === 'RECHARGE_NOT_FOUND') {
        return res.status(404).json({ error: 'RECHARGE_NOT_FOUND' })
      }

      if (error.message === 'ALREADY_PROCESSED') {
        return res.status(409).json({ error: 'ALREADY_PROCESSED' })
      }

      if (error.message === 'INVALID_RECHARGE_ID') {
        return res.status(400).json({ error: 'INVALID_RECHARGE_ID' })
      }

      if (error.message === 'INVALID_ADMIN') {
        return res.status(403).json({ error: 'INVALID_ADMIN' })
      }

      console.error('[ADMIN_RECHARGE_REJECT_ERROR]', error)

      return res.status(500).json({
        error: 'INTERNAL_ERROR'
      })
    }
  }
}