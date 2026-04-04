import { prisma } from '../../lib/prisma'

type Status = 'active' | 'completed' | 'all'

export class StoreService {

  static async myStore(
    userId: number,
    status: Status = 'all'
  ) {

    const now = new Date()

    let where: any = { userId }

    if (status === 'active') {
      where.endDate = { gte: now }
    }

    if (status === 'completed') {
      where.endDate = { lt: now }
    }

    const items = await prisma.userProduct.findMany({
      where,
      include: { product: true },
      orderBy: { startDate: 'desc' }
    })

    return items.map(item => {

      const isActive = item.endDate >= now

      const daily = Number(item.amount) * (Number(item.dailyRate) / 100)

      const totalDays = Math.floor(
        (item.endDate.getTime() - item.startDate.getTime()) / 86400000
      )

      const passedDays = Math.floor(
        (Math.min(now.getTime(), item.endDate.getTime()) - item.startDate.getTime()) / 86400000
      )

      const progress = Math.min((passedDays / totalDays) * 100, 100)

      const totalEarned = daily * passedDays

      const remainingDays = totalDays - passedDays

      return {
        id: item.id,

        productName: item.product.name,

        amount: item.amount,
        dailyRate: item.dailyRate,

        startDate: item.startDate,
        endDate: item.endDate,

        status: isActive ? 'active' : 'completed',

        dailyEarning: daily,
        totalDays,
        passedDays,
        remainingDays,

        progress: Number(progress.toFixed(2)),

        totalEarned
      }
    })
  }

  /* ================= RESUMO ================= */
  static async summary(userId: number) {

    const now = new Date()

    const items = await prisma.userProduct.findMany({
      where: { userId }
    })

    let active = 0
    let completed = 0
    let totalInvested = 0
    let totalEarned = 0

    for (const item of items) {

      const isActive = item.endDate >= now

      const daily = Number(item.amount) * (Number(item.dailyRate) / 100)

      const passedDays = Math.floor(
        (Math.min(now.getTime(), item.endDate.getTime()) - item.startDate.getTime()) / 86400000
      )

      if (isActive) active++
      else completed++

      totalInvested += Number(item.amount)
      totalEarned += daily * passedDays
    }

    return {
      active,
      completed,
      totalInvested,
      totalEarned
    }
  }
}