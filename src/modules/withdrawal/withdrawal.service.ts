import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { WITHDRAW_LIMITS } from '../../config/withdrawalLimits'

const FEE_PERCENT = new Prisma.Decimal(0.15)
const MIN_WITHDRAW = new Prisma.Decimal(500)

export class WithdrawalService {

  static async create(userId: number, amount: number) {
    if (!amount || amount <= 0)
      throw new Error('INVALID_AMOUNT')

    const decimalAmount = new Prisma.Decimal(amount)

    if (decimalAmount.lt(MIN_WITHDRAW)) {
      throw new Error('MIN_WITHDRAW_NOT_MET')
    }

    // ==========================================================
    // 🌍 AJUSTE DE FUSO HORÁRIO (ANGOLA GMT+1)
    // ==========================================================
    // Obtém a data e hora atual convertida para o fuso de Luanda
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-PT', {
      timeZone: 'Africa/Luanda',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const dateMap: any = {};
    parts.forEach(p => dateMap[p.type] = p.value);

    // Criamos um objeto de data que representa o momento EXATO em Luanda
    const day = now.getUTCDay(); // O dia da semana em UTC costuma coincidir, mas vamos validar
    const hour = parseInt(dateMap.hour);

    // 🚫 BLOQUEIO FIM DE SEMANA (Sábado = 6, Domingo = 0)
    // Usando getUTCDay ou calculando via parts para maior precisão se necessário
    const luandaDay = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Luanda"})).getDay();

    if (luandaDay === 0 || luandaDay === 6) {
      throw new Error('WITHDRAW_NOT_AVAILABLE_TODAY')
    }

    // ⏰ HORÁRIO (10h - 17:59)
    // Se forem 10h50 em Luanda, esta lógica agora permite o saque
    if (hour < 10 || hour >= 18) {
      throw new Error('WITHDRAW_OUT_OF_HOURS')
    }

    // Datas para filtros de limite (usando o início do dia em Luanda)
    const startOfDay = new Date(now.toLocaleString("en-US", {timeZone: "Africa/Luanda"}));
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

    return prisma.$transaction(async (tx) => {
      // 1. Lock do usuário e verificação de conta
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { bank: true },
      })

      if (!user) throw new Error('USER_NOT_FOUND')
      if (user.isBlocked) throw new Error('USER_BLOCKED')
      if (!user.bank) throw new Error('BANK_REQUIRED')

      // 2. 🚫 BLOQUEIO DE PENDING (Não permite dois saques ao mesmo tempo)
      const pending = await tx.withdrawal.findFirst({
        where: {
          userId,
          status: 'PENDING'
        }
      })

      if (pending) {
        throw new Error('WITHDRAW_PENDING_EXISTS')
      }

      // 3. 🚫 ANTI-SPAM (Máximo 1 saque por dia)
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

      // 4. Verificação de Saldo
      const currentBalance = new Prisma.Decimal(user.balance)
      if (currentBalance.lt(decimalAmount))
        throw new Error('INSUFFICIENT_BALANCE')

      // 5. 🔒 LIMITES (Transação e Mensal)
      if (decimalAmount.gt(WITHDRAW_LIMITS.PER_TRANSACTION))
        throw new Error('LIMIT_PER_TRANSACTION_EXCEEDED')

      const monthlyAgg = await tx.withdrawal.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
          status: { in: ['PENDING', 'SUCCESS'] }
        },
        _sum: { amount: true }
      })

      const monthlyTotal = new Prisma.Decimal(monthlyAgg._sum.amount ?? 0)

      if (monthlyTotal.add(decimalAmount).gt(WITHDRAW_LIMITS.MONTHLY))
        throw new Error('MONTHLY_LIMIT_EXCEEDED')

      // 6. 💰 TAXA E MOVIMENTAÇÃO
      const fee = decimalAmount.mul(FEE_PERCENT)

      // Decrementa o saldo disponível e incrementa o saldo congelado
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

      // 7. Auditoria e Logs
      await tx.transaction.create({
        data: {
          userId,
          amount: decimalAmount,
          type: 'WITHDRAW',
          description: `Solicitação de saque de ${decimalAmount} Kz`,
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
          description: 'Saque congelado para processamento',
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

      // Finaliza: remove do saldo congelado
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
          description: 'Saque concluído com sucesso',
        },
      })

      return updated
    })
  }
}