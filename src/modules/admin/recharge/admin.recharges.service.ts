import { prisma } from '../../../lib/prisma'
import {
  NotificationType,
  TransactionType,
  RechargeStatus,
  Prisma
} from '@prisma/client'

export class AdminRechargeService {

  /* =========================
     LIST
  ========================= */

  static async list() {
    return prisma.recharge.findMany({
      include: {
        user: {
          select: {
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /* =========================
     APPROVE
  ========================= */

  static async approve(id: number, adminId: number) {

    id = Number(id)
    adminId = Number(adminId)

    if (!Number.isInteger(id) || id <= 0)
      throw new Error('INVALID_RECHARGE_ID')

    if (!Number.isInteger(adminId) || adminId <= 0)
      throw new Error('INVALID_ADMIN')

    return prisma.$transaction(async (tx) => {

      const recharge = await tx.recharge.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              isBlocked: true,
            },
          },
        },
      })

      if (!recharge)
        throw new Error('RECHARGE_NOT_FOUND')

      if (recharge.status !== RechargeStatus.PENDING)
        throw new Error('ALREADY_PROCESSED')

      if (recharge.user.isBlocked)
        throw new Error('USER_BLOCKED')

      const amount = new Prisma.Decimal(recharge.amount)

      const updated = await tx.recharge.update({
        where: {
          id,
          status: RechargeStatus.PENDING // 🔐 proteção extra contra race condition
        },
        data: {
          status: RechargeStatus.APPROVED,
          approvedAt: new Date(),
        },
      })

      await tx.user.update({
        where: { id: recharge.userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      })

      await tx.transaction.create({
        data: {
          userId: recharge.userId,
          type: TransactionType.RECHARGE,
          amount: amount,
          description: 'Recharge approved by admin'
        },
      })

      await tx.notification.create({
        data: {
          userId: recharge.userId,
          title: 'Depósito aprovado',
          message: `Seu depósito de ${amount.toFixed(2)} Kz foi aprovado e já está disponível no saldo`,
          type: NotificationType.SUCCESS,
        },
      })

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'APPROVE_RECHARGE',
          entity: 'Recharge',
          entityId: recharge.id,
          metadata: {
            userId: recharge.userId,
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
      throw new Error('INVALID_RECHARGE_ID')

    if (!Number.isInteger(adminId) || adminId <= 0)
      throw new Error('INVALID_ADMIN')

    return prisma.$transaction(async (tx) => {

      const recharge = await tx.recharge.findUnique({
        where: { id },
      })

      if (!recharge)
        throw new Error('RECHARGE_NOT_FOUND')

      if (recharge.status !== RechargeStatus.PENDING)
        throw new Error('ALREADY_PROCESSED')

      const amount = new Prisma.Decimal(recharge.amount)

      const updated = await tx.recharge.update({
        where: {
          id,
          status: RechargeStatus.PENDING // 🔐 trava contra dupla execução
        },
        data: {
          status: RechargeStatus.REJECTED,
          rejectedAt: new Date(),
        },
      })

      await tx.notification.create({
        data: {
          userId: recharge.userId,
          title: 'Depósito rejeitado',
          message: `Seu depósito de ${amount.toFixed(2)} Kz foi rejeitado. Verifique os dados enviados.`,
          type: NotificationType.WARNING,
        },
      })

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'REJECT_RECHARGE',
          entity: 'Recharge',
          entityId: recharge.id,
          metadata: {
            userId: recharge.userId,
            amount: amount.toString(),
          },
        },
      })

      return updated

    })
  }
}