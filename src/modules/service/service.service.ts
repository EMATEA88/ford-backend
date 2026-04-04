import { prisma } from '../../lib/prisma'
import {
  ServiceStatus,
  SettlementStatus,
  RevenueType,
  ExpenseType,
  Prisma,
  LedgerType,
  TransactionType,
  UserRole
} from '@prisma/client'

export class ServiceService {

  static async listPartners() {
    return prisma.partner.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    })
  }

  static async listPlansByPartner(partnerId: number) {
    return prisma.servicePlan.findMany({
      where: { partnerId, isActive: true },
      select: { id: true, name: true, price: true }
    })
  }

  static async getUserRequests(userId: number) {
    return prisma.serviceRequest.findMany({
      where: { userId },
      include: {
        plan: { include: { partner: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // =============================
  // SECURE SERVICE PAYMENT
  // =============================

  static async processServicePayment(
    userId: number,
    planId: number
  ) {

    return prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({
        where: { id: userId }
      })

      if (!user) throw new Error('USER_NOT_FOUND')
      if (user.isBlocked) throw new Error('USER_BLOCKED')

      const plan = await tx.servicePlan.findUnique({
        where: { id: planId },
        include: { service: true }
      })

      if (!plan || !plan.isActive)
        throw new Error('PLAN_UNAVAILABLE')

      const balance = new Prisma.Decimal(user.balance)
      const price = new Prisma.Decimal(plan.price)
      const commissionPercent = new Prisma.Decimal(plan.service.commission)

      if (balance.lt(price))
        throw new Error('INSUFFICIENT_BALANCE')

      const commissionValue = price.mul(commissionPercent).div(100)
      const netAmount = price.sub(commissionValue)

      const newBalance = balance.sub(price)

      // 1️⃣ Debit user
      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance }
      })

      // 2️⃣ Create service request
      const request = await tx.serviceRequest.create({
        data: {
          userId,
          planId,
          serviceId: plan.serviceId,
          amount: price,
          status: ServiceStatus.IN_PROGRESS
        }
      })

      // 3️⃣ Partner settlement
      await tx.partnerSettlement.create({
        data: {
          partnerId: plan.partnerId,
          serviceId: plan.serviceId,
          grossAmount: price,
          commission: commissionValue,
          netAmount,
          status: SettlementStatus.PENDING
        }
      })

      // 4️⃣ Company revenue
      await tx.companyRevenue.create({
        data: {
          type: RevenueType.SERVICE_COMMISSION,
          amount: commissionValue,
          reference: `SERVICE_${request.id}`
        }
      })

      // 5️⃣ Company expense
      await tx.companyExpense.create({
        data: {
          type: ExpenseType.PARTNER_PAYOUT,
          amount: netAmount,
          reference: `SERVICE_${request.id}`,
          description: `Pagamento parceiro - ${plan.name}`
        }
      })

      // 6️⃣ Transaction record
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.SERVICE_DEBIT,
          amount: price,
          description: 'Service payment'
        }
      })

      // 7️⃣ Ledger entry (critical)
      await tx.ledgerEntry.create({
        data: {
          userId,
          type: LedgerType.DEBIT,
          amount: price,
          balanceBefore: balance,
          balanceAfter: newBalance,
          reference: `SERVICE-${request.id}`,
          description: 'Service payment'
        }
      })

      return {
        success: true,
        requestId: request.id
      }
    })
  }

  // =============================
  // ADMIN COMPLETE REQUEST
  // =============================

  static async completeRequest(
    requestId: number,
    adminId: number
  ) {

    return prisma.$transaction(async (tx) => {

      const admin = await tx.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      })

      if (!admin || admin.role !== UserRole.ADMIN)
        throw new Error('UNAUTHORIZED')

      const request = await tx.serviceRequest.findUnique({
        where: { id: requestId }
      })

      if (!request)
        throw new Error('REQUEST_NOT_FOUND')

      if (request.status !== ServiceStatus.IN_PROGRESS)
        throw new Error('INVALID_STATUS')

      await tx.serviceRequest.update({
        where: { id: requestId },
        data: { status: ServiceStatus.COMPLETED }
      })

      await tx.adminLog.create({
        data: {
          adminId,
          action: 'SERVICE_COMPLETED',
          entity: 'ServiceRequest',
          entityId: request.id,
          metadata: {
            userId: request.userId,
            planId: request.planId,
            serviceId: request.serviceId,
            amount: request.amount
          }
        }
      })

      return { success: true, requestId }
    })
  }
}