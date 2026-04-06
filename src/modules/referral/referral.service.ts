import { prisma } from '../../lib/prisma'

export class ReferralService {

  static async createReferral(userId: number, referralCode?: string) {
    if (!referralCode) return

    const inviter = await prisma.user.findUnique({
      where: { referralCode }
    })

    if (!inviter) return

    // 1. CRIAR NÍVEL 1
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

  // Função auxiliar para manter a sua ReferralTree em dia
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

  /* ... restante dos métodos (getMyTeam, processCommission) ... */
}