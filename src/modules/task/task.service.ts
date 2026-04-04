import { prisma } from '../../lib/prisma'

export class TaskService {

  static async complete(userId: number) {

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // ❗ já fez hoje?
    const exists = await prisma.dailyTask.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    if (exists) {
      throw new Error('TASK_ALREADY_COMPLETED')
    }

    const userProducts = await prisma.userProduct.findMany({
      where: {
        userId,
        endDate: { gte: new Date() }
      }
    })

    if (!userProducts.length) {
      throw new Error('NO_ACTIVE_PRODUCTS')
    }

    let totalReward = 0

    for (const up of userProducts) {
      totalReward += Number(up.dailyRate)
    }

    return prisma.$transaction(async (tx) => {

      await tx.dailyTask.create({
        data: {
          userId,
          date: new Date(), // ✅ salva timestamp real
          reward: totalReward
        }
      })

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: totalReward
          }
        }
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'INVESTMENT_CREDIT',
          amount: totalReward,
          description: 'Rendimento diário (tarefa)'
        }
      })

      return {
        reward: totalReward
      }
    })
  }

  static async status(userId: number) {

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const task = await prisma.dailyTask.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    return {
      completed: !!task,
      reward: task?.reward || 0
    }
  }

  static async history(userId: number) {
    return prisma.dailyTask.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    })
  }
}