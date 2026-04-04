import { prisma } from '../../lib/prisma'
import { TransactionType, Prisma } from '@prisma/client'

export class TransactionService {

  static async listByUser(
    userId: number,
    page = 1,
    limit = 20
  ) {

    if (!userId)
      throw new Error('UNAUTHORIZED')

    const safeLimit = Math.min(limit, 100)
    const skip = (page - 1) * safeLimit

    return prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        description: true,
        reference: true,
        createdAt: true,
        processedAt: true
      }
    })
  }

  /**
   * ⚠️ NÃO use fora do LedgerService
   */
  static async create(
    userId: number,
    type: TransactionType,
    amount: Prisma.Decimal | number
  ) {

    const decimalAmount = new Prisma.Decimal(amount)

    if (decimalAmount.lte(0))
      throw new Error('INVALID_AMOUNT')

    return prisma.transaction.create({
      data: {
        userId,
        type,
        amount: decimalAmount
      }
    })
  }
}