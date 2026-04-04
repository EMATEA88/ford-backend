import { prisma } from '../../../lib/prisma'
import crypto from 'crypto'

interface CreateGiftInput {
  code: string
  value: number
  expiresAt: Date
  adminId: number
}

interface CreateBatchInput {
  value: number
  quantity: number
  expiresInDays: number
  adminId: number
}

export class GiftAdminService {

  // =========================
  // CONSTANTES DE SEGURANÇA
  // =========================
  private static MAX_BATCH = 200
  private static MAX_VALUE = 10_000_000
  private static MAX_EXPIRY_DAYS = 365
  private static MAX_RETRY = 5

  // =========================
  // VALIDADORES INTERNOS
  // =========================
  private static validateValue(value: number) {
    if (!value || value <= 0)
      throw new Error('INVALID_VALUE')

    if (value > this.MAX_VALUE)
      throw new Error('VALUE_TOO_HIGH')
  }

  private static validateExpiry(days: number) {
    if (!days || days <= 0)
      throw new Error('INVALID_EXPIRY')

    if (days > this.MAX_EXPIRY_DAYS)
      throw new Error('EXPIRY_TOO_LONG')
  }

  private static validateQuantity(quantity: number) {
    if (!quantity || quantity <= 0)
      throw new Error('INVALID_QUANTITY')

    if (quantity > this.MAX_BATCH)
      throw new Error('BATCH_LIMIT_EXCEEDED')
  }

  // =========================
  // CRIAR CÓDIGO ÚNICO
  // =========================
  static async create(data: CreateGiftInput) {

    if (!data.adminId)
      throw new Error('ADMIN_REQUIRED')

    this.validateValue(data.value)

    if (!data.code || data.code.length < 6)
      throw new Error('INVALID_CODE')

    const existing = await prisma.giftCode.findUnique({
      where: { code: data.code }
    })

    if (existing)
      throw new Error('CODE_ALREADY_EXISTS')

    const gift = await prisma.giftCode.create({
      data: {
        code: data.code.toUpperCase(),
        value: data.value,
        expiresAt: data.expiresAt,
      }
    })

    await prisma.adminLog.create({
      data: {
        adminId: data.adminId,
        action: 'CREATE_GIFT_CODE',
        entity: 'GiftCode',
        entityId: gift.id,
        metadata: {
          value: gift.value,
          expiresAt: gift.expiresAt
        }
      }
    })

    return {
      id: gift.id,
      code: gift.code,
      value: gift.value,
      expiresAt: gift.expiresAt
    }
  }

  // =========================
  // LISTAR PAGINADO (SEGURANÇA PAGINAÇÃO)
  // =========================
  static async list(page = 1, limit = 20) {

    if (page < 1) page = 1
    if (limit < 1 || limit > 100) limit = 20

    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.giftCode.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          usedBy: {
            select: {
              id: true,
              phone: true,
            }
          }
        }
      }),
      prisma.giftCode.count()
    ])

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  // =========================
  // DESATIVAR CÓDIGO (IRREVERSÍVEL)
  // =========================
  static async disable(id: number, adminId: number) {

    if (!adminId)
      throw new Error('ADMIN_REQUIRED')

    const gift = await prisma.giftCode.findUnique({
      where: { id }
    })

    if (!gift)
      throw new Error('GIFT_NOT_FOUND')

    if (gift.used)
      throw new Error('GIFT_ALREADY_DISABLED')

    const updated = await prisma.giftCode.update({
      where: { id },
      data: {
        used: true,
        expiresAt: new Date()
      }
    })

    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'DISABLE_GIFT_CODE',
        entity: 'GiftCode',
        entityId: updated.id
      }
    })

    return {
      id: updated.id,
      disabled: true
    }
  }

  // =========================
  // GERAR LOTE BLINDADO
  // =========================
  static async createBatch(data: CreateBatchInput) {

    if (!data.adminId)
      throw new Error('ADMIN_REQUIRED')

    this.validateValue(data.value)
    this.validateQuantity(data.quantity)
    this.validateExpiry(data.expiresInDays)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays)

    return prisma.$transaction(async (tx) => {

      const created = []

      for (let i = 0; i < data.quantity; i++) {

        let code: string | null = null
        let attempts = 0

        while (!code && attempts < this.MAX_RETRY) {

          const candidate = crypto
            .randomBytes(6)
            .toString('hex')
            .toUpperCase()

          const exists = await tx.giftCode.findUnique({
            where: { code: candidate }
          })

          if (!exists) {
            code = candidate
          }

          attempts++
        }

        if (!code)
          throw new Error('CODE_GENERATION_FAILED')

        const gift = await tx.giftCode.create({
          data: {
            code,
            value: data.value,
            expiresAt
          }
        })

        created.push({
          id: gift.id,
          code: gift.code,
          value: gift.value,
          expiresAt: gift.expiresAt
        })
      }

      await tx.adminLog.create({
        data: {
          adminId: data.adminId,
          action: 'CREATE_GIFT_BATCH',
          entity: 'GiftCode',
          metadata: {
            quantity: data.quantity,
            value: data.value,
            expiresInDays: data.expiresInDays
          }
        }
      })

      return created
    })
  }
}
