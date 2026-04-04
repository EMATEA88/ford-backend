import { prisma } from '../../../lib/prisma'
import { TransactionType } from '@prisma/client'

export class AdminTransactionsService {
  static async list(
    page = 1,
    limit = 20,
    type?: TransactionType,
    userId?: number
  ) {
    const skip = (page - 1) * limit

    const where: any = {}

    if (type) where.type = type
    if (userId) where.userId = userId

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },

        // ⭐⭐⭐ AQUI É A CORREÇÃO
        include: {
          user: {
            select: {
              id: true,
              phone: true,
            },
          },
        },
      }),

      prisma.transaction.count({ where }),
    ])

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }
}