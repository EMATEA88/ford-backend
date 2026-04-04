import { Request, Response } from 'express'
import { AdminWithdrawalsService } from './admin.withdrawals.service'
import { WithdrawalStatus } from '@prisma/client'

export class AdminWithdrawalsController {

  // ================= LIST =================
  static async list(req: Request, res: Response) {

    const page = Number(req.query.page)
    const limit = Number(req.query.limit)

    let status: WithdrawalStatus | undefined

    if (
      req.query.status &&
      Object.values(WithdrawalStatus).includes(
        req.query.status as WithdrawalStatus
      )
    ) {
      status = req.query.status as WithdrawalStatus
    }

    try {

      const data = await AdminWithdrawalsService.list(
        page,
        limit,
        status
      )

      return res.status(200).json(data)

    } catch (error) {

      console.error('[ADMIN_WITHDRAWAL_LIST_ERROR]', error)

      return res.status(500).json({
        error: 'INTERNAL_ERROR'
      })
    }
  }

  // ================= EXPORT =================
  static async export(req: Request, res: Response) {

    let status: WithdrawalStatus = WithdrawalStatus.PENDING

    if (
      req.query.status &&
      Object.values(WithdrawalStatus).includes(
        req.query.status as WithdrawalStatus
      )
    ) {
      status = req.query.status as WithdrawalStatus
    }

    try {

      const data = await AdminWithdrawalsService.list(
        1,
        1000,
        status
      )

      return res.status(200).json(data.items)

    } catch (error) {

      console.error('[ADMIN_WITHDRAWAL_EXPORT_ERROR]', error)

      return res.status(500).json({
        error: 'INTERNAL_ERROR'
      })
    }
  }

  // ================= APPROVE =================
  static async approve(req: Request, res: Response) {

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'INVALID_WITHDRAWAL_ID'
      })
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'UNAUTHORIZED'
      })
    }

    const adminId = req.user.id

    try {

      const withdrawal =
        await AdminWithdrawalsService.approve(id, adminId)

      return res.status(200).json(withdrawal)

    } catch (error: any) {

      if (error.message === 'WITHDRAWAL_NOT_FOUND') {
        return res.status(404).json({ error: 'WITHDRAWAL_NOT_FOUND' })
      }

      if (error.message === 'USER_BLOCKED') {
        return res.status(403).json({ error: 'USER_BLOCKED' })
      }

      if (error.message === 'INVALID_STATUS') {
        return res.status(409).json({ error: 'INVALID_STATUS' })
      }

      if (error.message === 'INVALID_WITHDRAWAL_ID') {
        return res.status(400).json({ error: 'INVALID_WITHDRAWAL_ID' })
      }

      if (error.message === 'INVALID_ADMIN') {
        return res.status(403).json({ error: 'INVALID_ADMIN' })
      }

      console.error('[ADMIN_WITHDRAWAL_APPROVE_ERROR]', error)

      return res.status(500).json({
        error: 'INTERNAL_ERROR'
      })
    }
  }

  // ================= REJECT =================
  static async reject(req: Request, res: Response) {

    const id = Number(req.params.id)

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: 'INVALID_WITHDRAWAL_ID'
      })
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'UNAUTHORIZED'
      })
    }

    const adminId = req.user.id

    try {

      const withdrawal =
        await AdminWithdrawalsService.reject(id, adminId)

      return res.status(200).json(withdrawal)

    } catch (error: any) {

      if (error.message === 'WITHDRAWAL_NOT_FOUND') {
        return res.status(404).json({ error: 'WITHDRAWAL_NOT_FOUND' })
      }

      if (error.message === 'USER_BLOCKED') {
        return res.status(403).json({ error: 'USER_BLOCKED' })
      }

      if (error.message === 'INVALID_STATUS') {
        return res.status(409).json({ error: 'INVALID_STATUS' })
      }

      if (error.message === 'INVALID_WITHDRAWAL_ID') {
        return res.status(400).json({ error: 'INVALID_WITHDRAWAL_ID' })
      }

      if (error.message === 'INVALID_ADMIN') {
        return res.status(403).json({ error: 'INVALID_ADMIN' })
      }

      console.error('[ADMIN_WITHDRAWAL_REJECT_ERROR]', error)

      return res.status(500).json({
        error: 'INTERNAL_ERROR'
      })
    }
  }
}