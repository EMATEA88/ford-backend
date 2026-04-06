import { prisma } from '../../lib/prisma'

const LEVEL_PERCENTAGES = [0.1, 0.05, 0.02]

export class ReferralService {

  /* ================= CRIAR REFERÊNCIA & ATUALIZAR TREE ================= */
  static async createReferral(userId: number, referralCode?: string) {
    if (!referralCode) return

    const inviter = await prisma.user.findUnique({
      where: { referralCode }
    })

    if (!inviter) return

    // 1. CRIAR NÍVEL 1 NO HISTÓRICO
    await prisma.referral.create({
      data: { inviterId: inviter.id, invitedId: userId, level: 1 }
    }).catch(() => {})

    // 2. ATUALIZAR O CACHE (ReferralTree) DO NÍVEL 1
    await this.updateTreeCache(inviter.id, userId, 1)

    // 3. BUSCAR ANCESTRAIS PARA NÍVEL 2 E 3
    const ancestors = await prisma.referral.findMany({
      where: { invitedId: inviter.id }
    })

    for (const ancestor of ancestors) {
      const nextLevel = ancestor.level + 1

      if (nextLevel <= 3) {
        // Grava na tabela de histórico
        await prisma.referral.create({
          data: { inviterId: ancestor.inviterId, invitedId: userId, level: nextLevel }
        }).catch(() => {})

        // Atualiza o cache do avô/bisavô
        await this.updateTreeCache(ancestor.inviterId, userId, nextLevel)
      }
    }
  }

  /* ================= ATUALIZAR CACHE DA ÁRVORE ================= */
  private static async updateTreeCache(inviterId: number, newMemberId: number, level: number) {
    const field = `level${level}Ids` as 'level1Ids' | 'level2Ids' | 'level3Ids';

    await prisma.referralTree.upsert({
      where: { userId: inviterId },
      update: {
        [field]: { push: newMemberId }
      },
      create: {
        userId: inviterId,
        level1Ids: level === 1 ? [newMemberId] : [],
        level2Ids: level === 2 ? [newMemberId] : [],
        level3Ids: level === 3 ? [newMemberId] : [],
      }
    })
  }

  /* ================= BUSCAR MINHA EQUIPA (CORRIGIDO) ================= */
  static async getMyTeam(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) throw new Error('USER_NOT_FOUND')

    const link = `${process.env.FRONT_URL}/register?ref=${user.referralCode}`

    // Buscamos todos os membros vinculados a este usuário na tabela Referral
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

  /* ================= PROCESSAR COMISSÕES ================= */
  static async processCommission(userId: number, amount: number) {
    const referrals = await prisma.referral.findMany({
      where: { invitedId: userId }
    })

    for (const ref of referrals) {
      const percent = LEVEL_PERCENTAGES[ref.level - 1] || 0
      const commission = amount * percent

      await prisma.user.update({
        where: { id: ref.inviterId },
        data: { balance: { increment: commission } }
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
}