import { prisma } from '../../lib/prisma'
import {
  ServiceStatus,
  TransactionType,
  RevenueType,
  SettlementStatus,
  Prisma,
  LedgerType,
  UserRole
} from '@prisma/client'

export class ServiceRefundService {

  static async cancelAndRefund(
    requestId: number,
    adminId: number
  ) {

    return prisma.$transaction(async (tx) => {

      // 1️⃣ Validar ADMIN
      const admin = await tx.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      })

      if (!admin || admin.role !== UserRole.ADMIN)
        throw new Error('UNAUTHORIZED')

      // 2️⃣ Buscar request com dados completos
      const request = await tx.serviceRequest.findUnique({
        where: { id: requestId },
        include: {
          plan: {
            include: {
              service: true
            }
          }
        }
      })

      if (!request)
        throw new Error('REQUEST_NOT_FOUND')

      if (
        request.status === ServiceStatus.COMPLETED ||
        request.status === ServiceStatus.REJECTED
      ) {
        throw new Error('CANNOT_CANCEL')
      }

      const grossAmount = new Prisma.Decimal(request.amount)

      const commissionPercent = new Prisma.Decimal(
        request.plan.service.commission
      )

      const commissionValue = grossAmount
        .mul(commissionPercent)
        .div(100)

      const user = await tx.user.findUnique({
        where: { id: request.userId }
      })

      const currentBalance = new Prisma.Decimal(user!.balance)
      const newBalance = currentBalance.add(grossAmount)

      // 3️⃣ Procurar settlement correto
      const settlement = await tx.partnerSettlement.findFirst({
        where: {
          partnerId: request.plan.partnerId,
          serviceId: request.plan.serviceId,
          grossAmount: request.amount,
          status: SettlementStatus.PENDING
        }
      })

      // 4️⃣ Creditar usuário
      await tx.user.update({
        where: { id: request.userId },
        data: { balance: newBalance }
      })

      // 5️⃣ Registrar transação
      await tx.transaction.create({
        data: {
          userId: request.userId,
          type: TransactionType.REFUND,
          amount: grossAmount,
          description: 'Service refund'
        }
      })

      // 6️⃣ LedgerEntry obrigatório
      await tx.ledgerEntry.create({
        data: {
          userId: request.userId,
          type: LedgerType.CREDIT,
          amount: grossAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          reference: `REFUND-${request.id}`,
          description: 'Service refund'
        }
      })

      // 7️⃣ Atualizar request
      await tx.serviceRequest.update({
        where: { id: requestId },
        data: { status: ServiceStatus.REJECTED }
      })

      // 8️⃣ Reverter receita
      await tx.companyRevenue.create({
        data: {
          type: RevenueType.SERVICE_COMMISSION,
          amount: commissionValue.neg(),
          reference: `REFUND_${request.id}`
        }
      })

      // 9️⃣ Cancelar settlement
      if (settlement) {
        await tx.partnerSettlement.update({
          where: { id: settlement.id },
          data: { status: SettlementStatus.REJECTED }
        })
      }

      // 🔟 Log administrativo
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'SERVICE_REFUND',
          entity: 'ServiceRequest',
          entityId: request.id,
          metadata: {
            userId: request.userId,
            planId: request.planId,
            amount: grossAmount.toString(),
            commissionReversed: commissionValue.toString(),
            settlementId: settlement?.id ?? null
          }
        }
      })

      return {
        success: true,
        refundedAmount: grossAmount,
        requestId
      }
    })
  }
}