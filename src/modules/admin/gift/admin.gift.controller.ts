import { Request, Response } from 'express'
import { GiftAdminService } from './admin.gift.service'

export class GiftAdminController {

  // =========================
  // CRIAR CÓDIGO ÚNICO
  // =========================
  static async create(req: Request, res: Response) {
    try {

      const adminId = (req as any).userId
      if (!adminId)
        return res.status(401).json({ error: 'UNAUTHORIZED' })

      const { code, value, expiresAt } = req.body

      if (
        typeof code !== 'string' ||
        !code.trim() ||
        isNaN(Number(value)) ||
        Number(value) <= 0 ||
        !expiresAt
      ) {
        return res.status(400).json({ error: 'INVALID_DATA' })
      }

      const parsedDate = new Date(expiresAt)

      if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
        return res.status(400).json({ error: 'INVALID_EXPIRATION' })
      }

      const gift = await GiftAdminService.create({
        code: code.trim().toUpperCase(),
        value: Number(value),
        expiresAt: parsedDate,
        adminId
      })

      return res.status(201).json(gift)

    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'CREATE_FAILED'
      })
    }
  }

  // =========================
  // LISTAR (ADMIN) — PAGINADO
  // =========================
  static async list(req: Request, res: Response) {
    try {

      const page = Math.max(Number(req.query.page) || 1, 1)
      const limit = Math.min(
        Math.max(Number(req.query.limit) || 20, 1),
        100
      )

      const data = await GiftAdminService.list(page, limit)

      return res.json(data)

    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'LIST_FAILED'
      })
    }
  }

  // =========================
  // DESATIVAR CÓDIGO
  // =========================
  static async disable(req: Request, res: Response) {
    try {

      const adminId = (req as any).userId
      if (!adminId)
        return res.status(401).json({ error: 'UNAUTHORIZED' })

      const id = Number(req.params.id)

      if (!id || id <= 0)
        return res.status(400).json({ error: 'INVALID_ID' })

      const gift = await GiftAdminService.disable(id, adminId)

      return res.json(gift)

    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'DISABLE_FAILED'
      })
    }
  }

  // =========================
  // GERAR LOTE DE CÓDIGOS
  // =========================
  static async createBatch(req: Request, res: Response) {
    try {

      const adminId = (req as any).userId
      if (!adminId)
        return res.status(401).json({ error: 'UNAUTHORIZED' })

      const { value, quantity, expiresInDays } = req.body

      const numericValue = Number(value)
      const numericQuantity = Number(quantity)
      const numericDays = Number(expiresInDays)

      if (
        isNaN(numericValue) ||
        numericValue <= 0 ||
        isNaN(numericQuantity) ||
        numericQuantity <= 0 ||
        isNaN(numericDays) ||
        numericDays <= 0
      ) {
        return res.status(400).json({ error: 'INVALID_DATA' })
      }

      // 🔒 Blindagem anti abuso
      if (numericQuantity > 500)
        return res.status(400).json({
          error: 'QUANTITY_LIMIT_EXCEEDED'
        })

      if (numericValue > 10_000_000)
        return res.status(400).json({
          error: 'VALUE_TOO_HIGH'
        })

      const gifts = await GiftAdminService.createBatch({
        value: numericValue,
        quantity: numericQuantity,
        expiresInDays: numericDays,
        adminId
      })

      return res.status(201).json(gifts)

    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'BATCH_FAILED'
      })
    }
  }
}
