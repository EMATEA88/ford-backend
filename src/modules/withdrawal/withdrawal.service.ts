import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { WITHDRAW_LIMITS } from '../../config/withdrawalLimits'

const FEE_PERCENT = new Prisma.Decimal(0.15)

export class WithdrawalService {

  static async create(userId: number, amount: number) {

  if (!amount || amount <= 0)
    throw new Error('INVALID_AMOUNT')

  const decimalAmount = new Prisma.Decimal(amount)

  if (decimalAmount.lte(0))
    throw new Error('INVALID_AMOUNT')

  const MIN_WITHDRAW = new Prisma.Decimal(500)

  if (decimalAmount.lt(MIN_WITHDRAW)) {
    throw new Error('MIN_WITHDRAW_NOT_MET')
  }

  const now = new Date()

  const day = now.getDay() // 0=domingo, 6=sábado
  const hour = now.getHours()

  // ====================================
  // 🚫 BLOQUEIO FIM DE SEMANA
  // ====================================

  if (day === 0 || day === 6) {
    throw new Error('WITHDRAW_NOT_AVAILABLE_TODAY')
  }

  // ====================================
  // ⏰ HORÁRIO (10h - 17:59)
  // ====================================

  if (hour < 10 || hour >= 18) {
    throw new Error('WITHDRAW_OUT_OF_HOURS')
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  )

    return prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { bank: true },
      })

      if (!user) throw new Error('USER_NOT_FOUND')
      if (user.isBlocked) throw new Error('USER_BLOCKED')
      if (!user.bank) throw new Error('BANK_REQUIRED')

      // ====================================
      // 🚫 BLOQUEIO DE PENDING
      // ====================================

      const pending = await tx.withdrawal.findFirst({
        where: {
          userId,
          status: 'PENDING'
        }
      })

      if (pending) {
        throw new Error('WITHDRAW_PENDING_EXISTS')
      }

      // ====================================
      // 🚫 ANTI-SPAM (1 POR DIA)
      // ====================================

      const existingToday = await tx.withdrawal.findFirst({
        where: {
          userId,
          createdAt: { gte: startOfDay },
          status: {
            in: ['PENDING', 'SUCCESS']
          }
        }
      })

      if (existingToday) {
        throw new Error('DAILY_WITHDRAW_ALREADY_EXISTS')
      }

      const currentBalance = new Prisma.Decimal(user.balance)

      if (currentBalance.lt(decimalAmount))
        throw new Error('INSUFFICIENT_BALANCE')

      // ====================================
      // 🔒 LIMITE POR TRANSAÇÃO
      // ====================================

      if (decimalAmount.gt(WITHDRAW_LIMITS.PER_TRANSACTION))
        throw new Error('LIMIT_PER_TRANSACTION_EXCEEDED')

      // ====================================
      // 🔒 LIMITE MENSAL
      // ====================================

      const monthlyAgg = await tx.withdrawal.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
          status: { in: ['PENDING', 'SUCCESS'] }
        },
        _sum: { amount: true }
      })

      const monthlyTotal = new Prisma.Decimal(
        monthlyAgg._sum.amount ?? 0
      )

      if (monthlyTotal.add(decimalAmount)
        .gt(WITHDRAW_LIMITS.MONTHLY))
        throw new Error('MONTHLY_LIMIT_EXCEEDED')

      // ====================================
      // 💰 TAXA
      // ====================================

      const fee = decimalAmount.mul(FEE_PERCENT)

      // ====================================
      // 💳 MOVIMENTAÇÃO
      // ====================================

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: decimalAmount },
          frozenBalance: { increment: decimalAmount },
        },
      })

      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount: decimalAmount,
          fee,
          status: 'PENDING',
        },
      })

      await tx.transaction.create({
        data: {
          userId,
          amount: decimalAmount,
          type: 'WITHDRAW',
          description: 'Withdrawal request created',
        },
      })

      await tx.ledgerEntry.create({
        data: {
          userId,
          type: 'DEBIT',
          amount: decimalAmount,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance.sub(decimalAmount),
          reference: `WD-${withdrawal.id}`,
          description: 'Withdrawal request',
        },
      })

      return withdrawal
    })
  }

  static async success(withdrawalId: number) {

    return prisma.$transaction(async (tx) => {

      const withdrawal = await tx.withdrawal.findUnique({
        where: { id: withdrawalId },
      })

      if (!withdrawal || withdrawal.status !== 'APPROVED')
        throw new Error('INVALID_WITHDRAWAL')

      const user = await tx.user.findUnique({
        where: { id: withdrawal.userId }
      })

      if (!user) throw new Error('USER_NOT_FOUND')

      const decimalAmount = new Prisma.Decimal(withdrawal.amount)
      const frozenBefore = new Prisma.Decimal(user.frozenBalance)

      if (frozenBefore.lt(decimalAmount))
        throw new Error('FROZEN_BALANCE_MISMATCH')

      await tx.user.update({
        where: { id: withdrawal.userId },
        data: {
          frozenBalance: { decrement: decimalAmount }
        }
      })

      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'SUCCESS',
          processedAt: new Date()
        },
      })

      await tx.ledgerEntry.create({
        data: {
          userId: withdrawal.userId,
          type: 'DEBIT',
          amount: decimalAmount,
          balanceBefore: frozenBefore,
          balanceAfter: frozenBefore.sub(decimalAmount),
          reference: `WD-SUCCESS-${withdrawal.id}`,
          description: 'Withdrawal completed',
        },
      })

      return updated
    })
  }
}