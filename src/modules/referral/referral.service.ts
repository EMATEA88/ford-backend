import { prisma } from '../../lib/prisma'
import { User } from '@prisma/client'

const LEVEL_PERCENTAGES = [0.1, 0.05, 0.02]

export class ReferralService {

  /* ================= CRIAR REFERÊNCIA (CORRIGIDO) ================= */
  static async createReferral(userId: number, referralCode?: string) {
    if (!referralCode) return

    // 1. Pega quem é o dono do código (o padrinho direto)
    const inviter = await prisma.user.findUnique({
      where: { referralCode }
    })

    if (!inviter) return

    // 2. Criar o Nível 1 (Vínculo Direto)
    // Este é o convidado direto de quem enviou o link
    await prisma.referral.create({
      data: {
        inviterId: inviter.id,
        invitedId: userId,
        level: 1
      }
    }).catch(() => {
      console.log("Aviso: Vínculo de nível 1 já existe ou erro na criação.");
    })

    // 3. Lógica para Níveis Superiores (2 e 3)
    // Buscamos na tabela de referrals quem convidou o meu "inviter" atual.
    // Se o meu inviter é "filho" de alguém, esse "alguém" se torna meu "avô" (Nível 2).
    const ancestors = await prisma.referral.findMany({
      where: { invitedId: inviter.id }
    })

    for (const ancestor of ancestors) {
      const nextLevel = ancestor.level + 1

      // Limitamos a árvore até o nível 3 conforme sua regra
      if (nextLevel <= 3) {
        await prisma.referral.create({
          data: {
            inviterId: ancestor.inviterId, // O dono do nível superior
            invitedId: userId,             // O novo usuário
            level: nextLevel
          }
        }).catch(() => {})
      }
    }
  }

  /* ================= PROCESSAR COMISSÃO ================= */
  static async processCommission(userId: number, amount: number) {
    const referrals = await prisma.referral.findMany({
      where: { invitedId: userId }
    })

    for (const ref of referrals) {
      const percent = LEVEL_PERCENTAGES[ref.level - 1]
      const commission = amount * percent

      // Atualiza o saldo do patrocinador (independente do nível)
      await prisma.user.update({
        where: { id: ref.inviterId },
        data: {
          balance: { increment: commission }
        }
      })

      // Registra a comissão para histórico
      await prisma.commission.create({
        data: {
          userId: ref.inviterId,
          fromUserId: userId,
          level: ref.level,
          amount: commission,
          type: 'PURCHASE'
        }
      })

      // Registra a transação financeira
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

  /* ================= MEU TIME (LISTAGEM) ================= */
  static async getMyTeam(userId: number) {

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) throw new Error('USER_NOT_FOUND')

    const link = `${process.env.FRONT_URL}/register?ref=${user.referralCode}`

    // Busca todos os registros onde o usuário logado é o "inviter" (em qualquer nível)
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
      // Calcula quanto este membro específico já gerou de lucro para o usuário logado
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
      members // Aqui o frontend vai receber a lista completa filtrada por nível
    }
  }
}