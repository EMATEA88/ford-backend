import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'

export class AdminFinanceService {

  static async getFinancialOverview() {

    const [
      totalUsers,
      activeUsers,
      totalBalanceAgg,
      totalFrozenAgg,
      totalRechargesAgg,
      totalWithdrawalsAgg,
      pendingWithdrawals,
      pendingWithdrawalsAgg,
      totalApplicationsAgg
    ] = await Promise.all([

      // 👥 Total usuários
      prisma.user.count(),

      // 👥 Usuários ativos últimos 7 dias
      prisma.user.count({
        where: {
          lastSeen: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // 💰 Saldo total disponível
      prisma.user.aggregate({
        _sum: { balance: true }
      }),

      // 🧊 Saldo congelado (investimentos ativos)
      prisma.user.aggregate({
        _sum: { frozenBalance: true }
      }),

      // 💳 Total depósitos aprovados
      prisma.recharge.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true }
      }),

      // 💸 Total levantamentos concluídos
      prisma.withdrawal.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      }),

      // ⏳ Levantamentos pendentes
      prisma.withdrawal.count({
        where: { status: 'PENDING' }
      }),

      // 💸 Valor total pendente
      prisma.withdrawal.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true }
      }),

      // 📈 Investimentos ativos
      prisma.application.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true }
      }),

      // 🚨 Usuários em risco crítico
      
    ])

    const totalBalance = new Prisma.Decimal(totalBalanceAgg._sum.balance ?? 0)
    const totalFrozen = new Prisma.Decimal(totalFrozenAgg._sum.frozenBalance ?? 0)
    const totalRecharges = new Prisma.Decimal(totalRechargesAgg._sum.amount ?? 0)
    const totalWithdrawals = new Prisma.Decimal(totalWithdrawalsAgg._sum.amount ?? 0)
    const pendingWithdrawalsValue = new Prisma.Decimal(pendingWithdrawalsAgg._sum.amount ?? 0)
    const totalApplications = new Prisma.Decimal(totalApplicationsAgg._sum.amount ?? 0)

    // 📊 Liquidez real
    const totalUserExposure = totalBalance.add(totalFrozen)
    const platformNetFlow = totalRecharges.sub(totalWithdrawals)

    // 🚨 Alerta de risco de liquidez
    const liquidityRisk =
      pendingWithdrawalsValue.gt(platformNetFlow)

    return {
      users: {
        total: totalUsers,
        activeLast7Days: activeUsers,
      },

      balances: {
        available: totalBalance,
        frozen: totalFrozen,
        totalExposure: totalUserExposure
      },

      transactions: {
        totalRecharges,
        totalWithdrawals,
        platformNetFlow
      },

      withdrawals: {
        pendingCount: pendingWithdrawals,
        pendingValue: pendingWithdrawalsValue
      },

      investments: {
        activeAmount: totalApplications
      },

      alerts: {
        liquidityRisk
      }
    }
  }
}