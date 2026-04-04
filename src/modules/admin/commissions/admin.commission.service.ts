import { prisma } from '../../../lib/prisma'
import { Prisma } from '@prisma/client'

const MAX_LIMIT = 100

export class AdminCommissionService {

  static async list(
    page = 1,
    limit = 20
  ) {

    page = Number(page)
    limit = Number(limit)

    if (!Number.isInteger(page) || page <= 0) page = 1
    if (!Number.isInteger(limit) || limit <= 0) limit = 20
    if (limit > MAX_LIMIT) limit = MAX_LIMIT

    const skip = (page - 1) * limit

    const [data, total, totalAmount] = await Promise.all([

      prisma.commission.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: {
              phone: true,
              publicId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      prisma.commission.count(),

      prisma.commission.aggregate({
        _sum: { amount: true }
      })

    ])

    return {
      items: data.map(item => ({
        ...item,
        amount: item.amount.toString()
      })),
      total,
      totalAmount: (totalAmount._sum.amount ?? new Prisma.Decimal(0)).toString(),
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

}