import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { Prisma, TransactionType, LedgerType } from '@prisma/client'
import { LedgerService } from '../../services/ledger.service'

export class GiftService {

  /* =========================
     GENERATE (ADMIN)
  ========================= */

  static async generate(
    adminId: number,
    amount: number,
    expiresInDays: number,
    quantity = 1
  ) {

    if (!amount || amount <= 0)
      throw new Error('INVALID_AMOUNT')

    if (!expiresInDays || expiresInDays <= 0)
      throw new Error('INVALID_EXPIRATION')

    if (!quantity || quantity <= 0 || quantity > 100)
      throw new Error('INVALID_QUANTITY')

    const decimalAmount = new Prisma.Decimal(amount)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const gifts: {
      code: string
      value: Prisma.Decimal
      expiresAt: Date
    }[] = []

    for (let i = 0; i < quantity; i++) {

      const code = crypto
        .randomBytes(8)
        .toString('hex')
        .toUpperCase()

      gifts.push({
        code,
        value: decimalAmount,
        expiresAt
      })
    }

    await prisma.$transaction(async (tx) => {

      await tx.giftCode.createMany({
        data: gifts,
        skipDuplicates: true
      })

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'GENERATE_GIFT',
          entity: 'GiftCode',
          metadata: {
            quantity,
            amount: decimalAmount.toString(),
            expiresInDays
          }
        }
      })
    })

    return gifts
  }

  /* =========================
     REDEEM (ATÔMICO + LEDGER)
  ========================= */

  static async redeem(userId: number, rawCode: string) {

    if (!rawCode)
      throw new Error('INVALID_CODE')

    const code = rawCode.trim().toUpperCase()

    return prisma.$transaction(async (tx) => {

      const gift = await tx.giftCode.findUnique({
        where: { code }
      })

      if (!gift)
        throw new Error('GIFT_NOT_FOUND')

      if (gift.used)
        throw new Error('GIFT_ALREADY_USED')

      if (gift.expiresAt < new Date())
        throw new Error('GIFT_EXPIRED')

      const user = await tx.user.findUnique({
        where: { id: userId }
      })

      if (!user)
        throw new Error('USER_NOT_FOUND')

      if (user.isBlocked)
        throw new Error('USER_BLOCKED')

      // 🔐 Lock atômico
      const updated = await tx.giftCode.updateMany({
        where: {
          id: gift.id,
          used: false
        },
        data: {
          used: true,
          usedById: userId
        }
      })

      if (updated.count === 0)
        throw new Error('GIFT_ALREADY_USED')

      const amount = new Prisma.Decimal(gift.value)

      // 💰 Registrar via Ledger (imutável)
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.GIFT,
          amount,
          status: 'PAID',
          description: `Gift code ${code}`,
          processedAt: new Date()
        }
      })

      const currentBalance = new Prisma.Decimal(user.balance)
      const newBalance = currentBalance.add(amount)

      await tx.ledgerEntry.create({
        data: {
          userId,
          type: LedgerType.CREDIT,
          amount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          transactionId: transaction.id,
          reference: code,
          description: 'Gift credit'
        }
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: newBalance
        }
      })

      return {
        success: true,
        amount: amount.toString()
      }
    })
  }
}