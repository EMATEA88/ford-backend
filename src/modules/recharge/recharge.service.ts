import { prisma } from '../../lib/prisma'
import {
  RechargeStatus,
  TransactionType,
  NotificationType,
  Prisma,
  UserRole,
  LedgerType
} from '@prisma/client'

export class RechargeService {

  static async create(userId: number, amount: number) {

    if (!amount || amount <= 0)
      throw new Error('INVALID_AMOUNT')

    const decimalAmount = new Prisma.Decimal(amount)

    if (decimalAmount.lte(0))
      throw new Error('INVALID_AMOUNT')

    return prisma.recharge.create({
      data: {
        userId,
        amount: decimalAmount,
        status: RechargeStatus.PENDING
      },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true
      }
    })
  }

  static async listByUser(userId: number) {
    return prisma.recharge.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async approve(rechargeId: number, adminId: number) {

    return prisma.$transaction(async (tx) => {

      const admin = await tx.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      })

      if (!admin || admin.role !== UserRole.ADMIN)
        throw new Error('UNAUTHORIZED')

      const recharge = await tx.recharge.findUnique({
        where: { id: rechargeId },
        include: { user: true }
      })

      if (!recharge)
        throw new Error('RECHARGE_NOT_FOUND')

      if (recharge.status !== RechargeStatus.PENDING)
        throw new Error('RECHARGE_ALREADY_PROCESSED')

      if (recharge.user.isBlocked)
        throw new Error('USER_BLOCKED')

      const amount = new Prisma.Decimal(recharge.amount)

      if (amount.lte(0))
        throw new Error('INVALID_AMOUNT')

      const currentBalance = new Prisma.Decimal(recharge.user.balance)
      const newBalance = currentBalance.add(amount)

      await tx.recharge.update({
        where: { id: rechargeId },
        data: {
          status: RechargeStatus.APPROVED,
          approvedAt: new Date()
        }
      })

      await tx.user.update({
        where: { id: recharge.userId },
        data: {
          balance: newBalance
        }
      })

      await tx.transaction.create({
        data: {
          userId: recharge.userId,
          type: TransactionType.RECHARGE,
          amount: amount,
          description: 'Recharge approved'
        }
      })

      await tx.ledgerEntry.create({
        data: {
          userId: recharge.userId,
          type: LedgerType.CREDIT,
          amount: amount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          reference: `RC-${recharge.id}`,
          description: 'Recharge approved'
        }
      })

      await tx.adminLog.create({
        data: {
          adminId,
          action: "APPROVE_RECHARGE",
          entity: "Recharge",
          entityId: recharge.id,
          metadata: {
            userId: recharge.userId,
            amount: amount.toString()
          }
        }
      })

      await tx.notification.create({
        data: {
          userId: recharge.userId,
          title: 'Depósito aprovado',
          message: `Seu depósito de ${amount.toFixed(2)} AOA foi aprovado.`,
          type: NotificationType.SUCCESS
        }
      })

      return {
        success: true,
        newBalance
      }
    })
  }
}