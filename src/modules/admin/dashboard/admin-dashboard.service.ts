import { prisma } from '../../../lib/prisma'
import { RechargeStatus, WithdrawalStatus } from '@prisma/client'

export class AdminDashboardService {

  static async summary() {

    return prisma.$transaction(async (tx) => {

      const totalUsers = await tx.user.count()

      const totalBalanceAgg = await tx.user.aggregate({
        _sum: { balance: true }
      })

      const totalRechargesAgg = await tx.recharge.aggregate({
        where: { status: RechargeStatus.APPROVED },
        _sum: { amount: true }
      })

      const totalWithdrawalsAgg = await tx.withdrawal.aggregate({
        where: { status: WithdrawalStatus.SUCCESS },
        _sum: { amount: true }
      })

      const pendingWithdrawals = await tx.withdrawal.count({
        where: { status: WithdrawalStatus.PENDING }
      })

      const totalRevenueAgg = await tx.companyRevenue.aggregate({
        _sum: { amount: true }
      })

      const totalExpenseAgg = await tx.companyExpense.aggregate({
        _sum: { amount: true }
      })

      const totalWalletBalance = Number(totalBalanceAgg._sum.balance ?? 0)
      const totalRecharges = Number(totalRechargesAgg._sum.amount ?? 0)
      const totalWithdrawals = Number(totalWithdrawalsAgg._sum.amount ?? 0)
      const totalRevenue = Number(totalRevenueAgg._sum.amount ?? 0)
      const totalExpense = Number(totalExpenseAgg._sum.amount ?? 0)

      return {
        totalUsers,
        totalWalletBalance,
        totalRecharges,
        totalWithdrawals,
        pendingWithdrawals,
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense
      }

    }, {
      timeout: 10000
    })
  }
}