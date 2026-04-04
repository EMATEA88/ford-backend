import { prisma } from '../../lib/prisma'

export class EarningsService {

  static async get(userId: number) {

    const today = new Date()
    today.setHours(0,0,0,0)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    // 💰 saldo atual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    })

    // 📊 total rendimento
    const totalEarnings = await prisma.dailyTask.aggregate({
      where: { userId },
      _sum: { reward: true }
    })

    // 💸 total comissão
    const totalCommission = await prisma.commission.aggregate({
      where: { userId },
      _sum: { amount: true }
    })

    // 📅 ganhos hoje (CORRETO)
    const todayTask = await prisma.dailyTask.aggregate({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: { reward: true }
    })

    // 📅 comissão hoje (CORRETO)
    const todayCommission = await prisma.commission.aggregate({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: { amount: true }
    })

    // 📦 total investido
    const invested = await prisma.userProduct.aggregate({
      where: { userId },
      _sum: { amount: true }
    })

    return {
      balance: user?.balance || 0,

      totalEarnings: totalEarnings._sum.reward || 0,
      totalCommission: totalCommission._sum.amount || 0,

      todayEarnings: todayTask._sum.reward || 0,
      todayCommission: todayCommission._sum.amount || 0,

      totalInvested: invested._sum.amount || 0,

      totalProfit:
        Number(totalEarnings._sum.reward || 0) +
        Number(totalCommission._sum.amount || 0)
    }
  }
}