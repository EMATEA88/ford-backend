import { prisma } from '../../../lib/prisma'
import {
  WithdrawalStatus,
  TransactionType,
  NotificationType,
  Prisma
} from '@prisma/client'

const MAX_LIMIT = 100

export class AdminWithdrawalsService {

  /* =========================
     LIST
  ========================= */

  static async list(
    page = 1,
    limit = 20,
    status?: WithdrawalStatus
  ) {

    page = Number(page)
    limit = Number(limit)

    if (!Number.isInteger(page) || page <= 0) page = 1
    if (!Number.isInteger(limit) || limit <= 0) limit = 20
    if (limit > MAX_LIMIT) limit = MAX_LIMIT

    if (status && !Object.values(WithdrawalStatus).includes(status))
      status = undefined

    const skip = (page - 1) * limit
    const where = status ? { status } : {}

    const [rawWithdrawals, total] = await prisma.$transaction([
      prisma.withdrawal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: { bank: true },
          },
        },
      }),
      prisma.withdrawal.count({ where }),
    ])

    const items = rawWithdrawals.map((w: any) => {

      const amount = new Prisma.Decimal(w.amount || 0)
      const fee = new Prisma.Decimal(w.fee || 0)
      const liquid = amount.sub(fee)

      return {
        id: w.id,
        userPhone: w.user?.phone ?? '-',
        iban: w.user?.bank?.iban ?? '-',
        amount: Number(amount),
        fee: Number(fee),
        liquid: Number(liquid),
        status: w.status,
        createdAt: w.createdAt,
        approvedAt: w.approvedAt,
        rejectedAt: w.rejectedAt,
      }
    })

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  /* =========================
     APPROVE
  ========================= */

  static async approve(id: number, adminId: number) {

    id = Number(id)
    adminId = Number(adminId)

    if (!Number.isInteger(id) || id <= 0)
      throw new Error('INVALID_WITHDRAWAL_ID')

    if (!Number.isInteger(adminId) || adminId <= 0)
      throw new Error('INVALID_ADMIN')

    return prisma.$transaction(async (tx) => {

      const withdrawal = await tx.withdrawal.findUnique({
        where: { id },
        include: {
          user: { select: { isBlocked: true } },
        },
      })

      if (!withdrawal)
        throw new Error('WITHDRAWAL_NOT_FOUND')

      if (withdrawal.user.isBlocked)
        throw new Error('USER_BLOCKED')

      if (withdrawal.status !== WithdrawalStatus.PENDING)
        throw new Error('INVALID_STATUS')

      const amount = new Prisma.Decimal(withdrawal.amount)

      const updated = await tx.withdrawal.update({
        where: {
          id,
          status: WithdrawalStatus.PENDING // 🔐 trava contra race condition
        },
        data: {
          status: WithdrawalStatus.APPROVED,
          approvedAt: new Date(),
        },
      })

      await tx.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: TransactionType.WITHDRAW,
          amount: amount,
          description: 'Withdrawal approved'
        },
      })

      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Levantamento aprovado',
          message: `Seu levantamento de ${amount.toFixed(2)} Kz foi aprovado`,
          type: NotificationType.SUCCESS,
        },
      })

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'APPROVE_WITHDRAWAL',
          entity: 'Withdrawal',
          entityId: withdrawal.id,
          metadata: {
            userId: withdrawal.userId,
            amount: amount.toString(),
          },
        },
      })

      return updated
    })
  }

  /* =========================
     REJECT
  ========================= */

  static async reject(id: number, adminId: number) {

    id = Number(id)
    adminId = Number(adminId)

    if (!Number.isInteger(id) || id <= 0)
      throw new Error('INVALID_WITHDRAWAL_ID')

    if (!Number.isInteger(adminId) || adminId <= 0)
      throw new Error('INVALID_ADMIN')

    return prisma.$transaction(async (tx) => {

      const withdrawal = await tx.withdrawal.findUnique({
        where: { id },
        include: {
          user: { select: { isBlocked: true } },
        },
      })

      if (!withdrawal)
        throw new Error('WITHDRAWAL_NOT_FOUND')

      if (withdrawal.user.isBlocked)
        throw new Error('USER_BLOCKED')

      if (withdrawal.status !== WithdrawalStatus.PENDING)
        throw new Error('INVALID_STATUS')

      const amount = new Prisma.Decimal(withdrawal.amount)

      // 🔐 devolve saldo
      await tx.user.update({
        where: { id: withdrawal.userId },
        data: {
          balance: { increment: amount },
        },
      })

      const updated = await tx.withdrawal.update({
        where: {
          id,
          status: WithdrawalStatus.PENDING
        },
        data: {
          status: WithdrawalStatus.REJECTED,
          rejectedAt: new Date(),
        },
      })

      await tx.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: TransactionType.RECHARGE, // 🔥 corrigido (é devolução)
          amount: amount,
          description: 'Withdrawal rejected - funds returned'
        },
      })

      await tx.notification.create({
        data: {
          userId: withdrawal.userId,
          title: 'Levantamento rejeitado',
          message: `Seu levantamento de ${amount.toFixed(2)} Kz foi rejeitado e o valor foi devolvido.`,
          type: NotificationType.WARNING,
        },
      })

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'REJECT_WITHDRAWAL',
          entity: 'Withdrawal',
          entityId: withdrawal.id,
          metadata: {
            userId: withdrawal.userId,
            amount: amount.toString(),
          },
        },
      })

      return updated
    })
  }
}