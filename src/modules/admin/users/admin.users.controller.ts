import { Request, Response } from 'express'
import { AdminUsersService } from './admin.users.service'

export class AdminUsersController {

  // ================= LIST =================
  static async list(_req: Request, res: Response) {
    const data = await AdminUsersService.list()
    return res.json(data)
  }

  // ================= DETAIL =================
  static async detail(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      const user = await AdminUsersService.getById(id)
      return res.json(user)
    } catch (err: any) {
      return res.status(404).json({ error: err.message })
    }
  }

  // ================= ROLE =================
  static async updateRole(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      const { role } = req.body
      const adminId = (req as any).userId

      if (!['USER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'INVALID_ROLE' })
      }

      const user = await AdminUsersService.updateRole(
        id,
        role,
        adminId
      )

      return res.json(user)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  // ================= BLOCK USER =================
  static async block(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      const adminId = (req as any).userId

      const user = await AdminUsersService.blockUser(
        id,
        adminId
      )

      return res.json(user)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  // ================= UNBLOCK USER =================
  static async unblock(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      const adminId = (req as any).userId

      const user = await AdminUsersService.unblockUser(
        id,
        adminId
      )

      return res.json(user)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  // ================= BALANCE =================
  static async adjustBalance(req: Request, res: Response) {
    try {
      const id = Number(req.params.id)
      const { amount, action } = req.body
      const adminId = (req as any).userId

      if (!['ADD', 'SUBTRACT'].includes(action)) {
        return res.status(400).json({ error: 'INVALID_ACTION' })
      }

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'INVALID_AMOUNT' })
      }

      const result = await AdminUsersService.adjustBalance(
        id,
        Number(amount),
        action,
        adminId
      )

      return res.json({
        success: true,
        balance: result.balance,
      })

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }
}
