import { prisma } from '../../lib/prisma'

const LEVELS = [
  { level: 1, percent: 0.10 },
  { level: 2, percent: 0.05 },
  { level: 3, percent: 0.02 }
]

export class CommissionService {

  static async processFromPurchase(userId: number, amount: number) {

    const referrals = await prisma.referral.findMany({
      where: { invitedId: userId }
    })

    if (!referrals.length) return

    // 🔥 executa tudo em paralelo
    const operations = referrals.map(ref => {

      const config = LEVELS.find(l => l.level === ref.level)
      if (!config) return null

      const commissionAmount = amount * config.percent

      return prisma.$transaction([
        prisma.user.update({
          where: { id: ref.inviterId },
          data: {
            balance: {
              increment: commissionAmount
            }
          }
        }),

        prisma.commission.create({
          data: {
            userId: ref.inviterId,
            fromUserId: userId,
            level: ref.level,
            amount: commissionAmount,
            type: 'PURCHASE'
          }
        }),

        prisma.transaction.create({
          data: {
            userId: ref.inviterId,
            type: 'COMMISSION',
            amount: commissionAmount,
            description: `Comissão nível ${ref.level} (compra produto)`
          }
        })
      ])
    })

    // remove nulls + executa tudo
    await Promise.all(operations.filter(Boolean))
  }
}