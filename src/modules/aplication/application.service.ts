import { prisma } from '../../lib/prisma'
import {
  ApplicationStatus,
  TransactionType,
  NotificationType,
  Prisma,
  LedgerType,
  UserRole
} from '@prisma/client'

const PENALTY_RATE = new Prisma.Decimal(0.02)

function getInterestRate(periodDays: number): Prisma.Decimal {

  if (periodDays === 15)
    return new Prisma.Decimal(5)

  if (periodDays === 90)
    return new Prisma.Decimal(7)

  if (periodDays === 180)
    return new Prisma.Decimal(10)

  if (periodDays === 365)
    return new Prisma.Decimal(20)

  if (periodDays === 730)
    return new Prisma.Decimal(40)

  throw new Error('INVALID_PERIOD')
}

export class ApplicationService {

  static async create(
    userId: number,
    amount: number,
    periodDays: number
  ) {

    if (!amount || amount <= 0)
      throw new Error('INVALID_AMOUNT')

    const decimalAmount = new Prisma.Decimal(amount)

    return prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({
        where: { id: userId }
      })

      if (!user) throw new Error('USER_NOT_FOUND')
      if (user.isBlocked) throw new Error('USER_BLOCKED')

      const currentBalance = new Prisma.Decimal(user.balance)

      if (currentBalance.lt(decimalAmount))
        throw new Error('INSUFFICIENT_BALANCE')

      const interestRate = getInterestRate(periodDays)

      const profit = decimalAmount
        .mul(interestRate)
        .div(100)

      const totalReturn = decimalAmount.add(profit)

      const now = new Date()

      const maturityDate = new Date(
       now.getTime() + periodDays * 86400000
    )

      const newBalance = currentBalance.sub(decimalAmount)

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: newBalance,
          frozenBalance: {
            increment: decimalAmount
          }
        }
      })

      const application = await tx.application.create({
        data: {
          userId,
          amount: decimalAmount,
          interestRate,
          periodDays,
          expectedProfit: profit,
          totalReturn,
          maturityDate,
          status: ApplicationStatus.ACTIVE
        }
      })

      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.INVESTMENT_DEBIT,
          amount: decimalAmount
        }
      })

      await tx.ledgerEntry.create({
        data: {
          userId,
          type: LedgerType.DEBIT,
          amount: decimalAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          reference: `INV-${application.id}`,
          description: 'Investment created'
        }
      })

      await tx.notification.create({
        data: {
          userId,
          title: 'Investimento realizado',
          message: `Aplicação de ${decimalAmount.toFixed(2)} Kz criada.`,
          type: NotificationType.SUCCESS
        }
      })

      return application
    })
  }

  static async cancelByAdmin(
    applicationId: number,
    adminId: number
  ) {

    return prisma.$transaction(async (tx) => {

      const admin = await tx.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      })

      if (!admin || admin.role !== UserRole.ADMIN)
        throw new Error('UNAUTHORIZED')

      const app = await tx.application.findUnique({
        where: { id: applicationId }
      })

      if (!app)
        throw new Error('APPLICATION_NOT_FOUND')

      if (app.status !== ApplicationStatus.ACTIVE)
        throw new Error('INVALID_STATUS')

      const amount = new Prisma.Decimal(app.amount)
      const penalty = amount.mul(PENALTY_RATE)
      const refund = amount.sub(penalty)

      const user = await tx.user.findUnique({
        where: { id: app.userId }
      })

      const currentBalance = new Prisma.Decimal(user!.balance)
      const newBalance = currentBalance.add(refund)

      await tx.user.update({
        where: { id: app.userId },
        data: {
          frozenBalance: { decrement: amount },
          balance: newBalance
        }
      })

      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.CANCELLED,
          redeemedAt: new Date()
        }
      })

      await tx.transaction.create({
        data: {
          userId: app.userId,
          type: TransactionType.INVESTMENT_CANCEL_REFUND,
          amount: refund
        }
      })

      await tx.ledgerEntry.create({
        data: {
          userId: app.userId,
          type: LedgerType.CREDIT,
          amount: refund,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          reference: `INV-CANCEL-${app.id}`,
          description: 'Investment cancelled'
        }
      })

      return { success: true }
    })
  }

  static async processMaturities() {

    const now = new Date()

    const apps = await prisma.application.findMany({
      where: {
        status: ApplicationStatus.ACTIVE,
        maturityDate: { lte: now }
      }
    })

    for (const app of apps) {

      await prisma.$transaction(async (tx) => {

        const fresh = await tx.application.findUnique({
  where: { id: app.id }
})

if (!fresh) return

// 🔒 proteção contra duplicação
if (fresh.redeemedAt) return

if (fresh.status !== ApplicationStatus.ACTIVE)
  return

        const amount = new Prisma.Decimal(fresh.amount)
        const totalReturn = new Prisma.Decimal(fresh.totalReturn)

        const user = await tx.user.findUnique({
          where: { id: fresh.userId }
        })

        const currentBalance = new Prisma.Decimal(user!.balance)
        const newBalance = currentBalance.add(totalReturn)

        await tx.user.update({
          where: { id: fresh.userId },
          data: {
            frozenBalance: { decrement: amount },
            balance: newBalance
          }
        })

        await tx.application.update({
          where: { id: fresh.id },
          data: {
            status: ApplicationStatus.MATURED,
            redeemedAt: new Date()
          }
        })

        await tx.transaction.create({
          data: {
            userId: fresh.userId,
            type: TransactionType.INVESTMENT_CREDIT,
            amount: totalReturn
          }
        })

        await tx.ledgerEntry.create({
          data: {
            userId: fresh.userId,
            type: LedgerType.CREDIT,
            amount: totalReturn,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            reference: `INV-MATURE-${fresh.id}`,
            description: 'Investment matured'
          }
        })
      })
    }

    return { processed: apps.length }
  }

  static async listByUser(userId: number) {
    return prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
  }
}