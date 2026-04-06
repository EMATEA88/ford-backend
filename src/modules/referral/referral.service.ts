import { prisma } from '../../lib/prisma'
import { User } from '@prisma/client'

const LEVEL_PERCENTAGES = [0.1, 0.05, 0.02]

export class ReferralService {

  static async createReferral(userId: number, referralCode?: string) {
  if (!referralCode) return

  // 🔹 pega quem convidou
  const inviter = await prisma.user.findUnique({
    where: { referralCode }
  })

  if (!inviter) return

  // 🔹 pega TODOS os níveis do inviter
  const inviterTree = await prisma.referral.findMany({
    where: {
      invitedId: inviter.id
    }
  })

  // 🔹 nível 1
  await prisma.referral.create({
    data: {
      inviterId: inviter.id,
      invitedId: userId,
      level: 1
    }
  }).catch(() => {})

  // 🔹 gerar níveis automaticamente
  for (const ref of inviterTree) {

    const nextLevel = ref.level + 1

    if (nextLevel > 3) continue

    await prisma.referral.create({
      data: {
        inviterId: ref.inviterId,
        invitedId: userId,
        level: nextLevel
      }
    }).catch(() => {})
  }
}

  /* ================= COMISSÃO ================= */
  static async processCommission(userId: number, amount: number) {
    const referrals = await prisma.referral.findMany({
      where: { invitedId: userId }
    })

    for (const ref of referrals) {
      const percent = LEVEL_PERCENTAGES[ref.level - 1]
      const commission = amount * percent

      await prisma.user.update({
        where: { id: ref.inviterId },
        data: {
          balance: { increment: commission }
        }
      })

      await prisma.commission.create({
        data: {
          userId: ref.inviterId,
          fromUserId: userId,
          level: ref.level,
          amount: commission,
          type: 'PURCHASE'
        }
      })

      await prisma.transaction.create({
        data: {
          userId: ref.inviterId,
          type: 'COMMISSION',
          amount: commission,
          description: `Comissão nível ${ref.level}`
        }
      })
    }
  }

  /* ================= MEU TIME ================= */
  static async getMyTeam(userId: number) {

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) throw new Error('USER_NOT_FOUND')

    const link = `${process.env.FRONT_URL}/register?ref=${user.referralCode}`

    const referrals = await prisma.referral.findMany({
      where: { inviterId: userId },
      include: {
        invited: {
          select: {
            id: true,
            phone: true,
            createdAt: true
          }
        }
      }
    })

    const commissions = await prisma.commission.findMany({
      where: { userId }
    })

    const members = referrals.map(ref => {

      const totalGenerated = commissions
        .filter(c => c.fromUserId === ref.invitedId)
        .reduce((sum, c) => sum + Number(c.amount), 0)

      return {
        ...ref,
        totalGenerated
      }
    })

    return {
      link,
      level1: members.filter(r => r.level === 1).length,
      level2: members.filter(r => r.level === 2).length,
      level3: members.filter(r => r.level === 3).length,
      members
    }
  }
}