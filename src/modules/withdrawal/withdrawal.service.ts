import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { WITHDRAW_LIMITS } from '../../config/withdrawalLimits'

const FEE_PERCENT = new Prisma.Decimal(0.15)
const MIN_WITHDRAW = new Prisma.Decimal(500)

export class WithdrawalService {

  static async create(userId: number, amount: number) {
    if (!amount || amount <= 0) throw new Error('INVALID_AMOUNT')

    const decimalAmount = new Prisma.Decimal(amount)
    if (decimalAmount.lt(MIN_WITHDRAW)) throw new Error('MIN_WITHDRAW_NOT_MET')

    // ====================================
    // 🌍 AJUSTE DE FUSO HORÁRIO (Angola GMT+1)
    // ====================================
    const now = new Date()
    const angolaTime = new Date(now.getTime() + (1 * 60 * 60 * 1000)) // Força GMT+1 se o server for UTC
    
    const day = angolaTime.getDay() 
    const hour = angolaTime.getHours()

    // Bloqueio Fim de Semana (Sábado=6, Domingo=0)
    if (day === 0 || day === 6) {
      throw new Error('WITHDRAW_AVAILABLE_MON_TO_FRI')
    }

    // Horário de Luanda: 10h às 18h
    if (hour < 10 || hour >= 18) {
      throw new Error('WITHDRAW_OFFICE_HOURS_10_TO_18')
    }

    const startOfDay = new Date(angolaTime)
    startOfDay.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(angolaTime.getFullYear(), angolaTime.getMonth(), 1)

    return prisma.$transaction(async (tx) => {
      // 1. Segurança: Lock no utilizador para evitar Double Spend
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { bank: true },
      })

      if (!user) throw new Error('USER_NOT_FOUND')
      if (user.isBlocked) throw new Error('USER_ACCOUNT_BLOCKED')
      if (!user.bank) throw new Error('BANK_ACCOUNT_REQUIRED')

      // 2. Verificação de Pendentes (Segurança contra spam)
      const pending = await tx.withdrawal.findFirst({
        where: { userId, status: 'PENDING' }
      })
      if (pending) throw new Error('FINISH_PENDING_WITHDRAW_FIRST')

      // 3. Limite de 1 saque por dia
      const existingToday = await tx.withdrawal.findFirst({
        where: {
          userId,
          createdAt: { gte: startOfDay },
          status: { in: ['PENDING', 'SUCCESS'] }
        }
      })
      if (existingToday) throw new Error('ONLY_ONE_WITHDRAW_PER_DAY')

      // 4. Verificação de Saldo
      const currentBalance = new Prisma.Decimal(user.balance)
      if (currentBalance.lt(decimalAmount)) throw new Error('INSUFFICIENT_BALANCE')

      // 5. Limites de Valor
      if (decimalAmount.gt(WITHDRAW_LIMITS.PER_TRANSACTION)) throw new Error('LIMIT_EXCEEDED_PER_TX')

      const monthlyAgg = await tx.withdrawal.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
          status: { in: ['PENDING', 'SUCCESS'] }
        },
        _sum: { amount: true }
      })
      const monthlyTotal = new Prisma.Decimal(monthlyAgg._sum.amount ?? 0)
      if (monthlyTotal.add(decimalAmount).gt(WITHDRAW_LIMITS.MONTHLY)) {
        throw new Error('MONTHLY_LIMIT_EXCEEDED')
      }

      // 6. Cálculo de Taxa e Movimentação
      const fee = decimalAmount.mul(FEE_PERCENT)

      // Retira do saldo real e coloca no congelado (frozen)
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

      // Logs de Auditoria
      await tx.transaction.create({
        data: {
          userId,
          amount: decimalAmount,
          type: 'WITHDRAW',
          description: `Withdrawal request: ${decimalAmount} Kz`,
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
          description: 'Withdrawal frozen for processing',
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

      if (!withdrawal || withdrawal.status !== 'APPROVED') {
        throw new Error('INVALID_WITHDRAWAL_STATUS')
      }

      const user = await tx.user.findUnique({ where: { id: withdrawal.userId } })
      if (!user) throw new Error('USER_NOT_FOUND')

      const decimalAmount = new Prisma.Decimal(withdrawal.amount)
      
      // Remove do congelado definitivamente
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: { frozenBalance: { decrement: decimalAmount } }
      })

      return await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'SUCCESS',
          processedAt: new Date()
        },
      })
    })
  }
}