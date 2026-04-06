import { prisma } from '../../lib/prisma'

const LEVEL_PERCENTAGES = [0.1, 0.05, 0.02]

export class ReferralService {

  /* ================= MEU TIME + LINK ================= */
  static async getMyTeam(userId: number) {

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) throw new Error('USER_NOT_FOUND')

    const link = `${process.env.FRONT_URL}/register?ref=${user.referralCode}`

    /* ================= BUSCAR TODOS REFERRALS ================= */
    const referrals = await prisma.referral.findMany({
      where: {
        inviterId: userId
      },
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

    /* 🔥 BUSCAR NÍVEL 2 E 3 */
    const level2And3 = await prisma.referral.findMany({
      where: {
        inviter: {
          referredByCode: user.referralCode
        }
      },
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

    const all = [...referrals, ...level2And3]

    /* ================= COMISSÕES ================= */
    const commissions = await prisma.commission.findMany({
      where: {
        userId
      }
    })

    const members = all.map(ref => {

      const totalGenerated = commissions
        .filter(c => c.fromUserId === ref.invitedId)
        .reduce((sum, c) => sum + Number(c.amount), 0)

      return {
        ...ref,
        totalGenerated
      }
    })

    const level1 = members.filter(r => r.level === 1).length
    const level2 = members.filter(r => r.level === 2).length
    const level3 = members.filter(r => r.level === 3).length

    return {
      link,
      level1,
      level2,
      level3,
      members
    }
  }
}