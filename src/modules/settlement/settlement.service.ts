import { prisma } from '../../lib/prisma'
import {
  SettlementStatus,
  ExpenseType,
  Prisma,
  UserRole
} from '@prisma/client'

export class SettlementService {

  static async settlePartner(
    settlementId: number,
    adminId: number
  ) {

    if (!settlementId || settlementId <= 0)
      throw new Error('INVALID_SETTLEMENT_ID')

    return prisma.$transaction(async (tx) => {

      // 1️⃣ Validar ADMIN
      const admin = await tx.user.findUnique({
        where: { id: adminId },
        select: { role: true }
      })

      if (!admin || admin.role !== UserRole.ADMIN)
        throw new Error('UNAUTHORIZED')

      // 2️⃣ Buscar settlement
      const settlement = await tx.partnerSettlement.findUnique({
        where: { id: settlementId },
        include: { partner: true }
      })

      if (!settlement)
        throw new Error('SETTLEMENT_NOT_FOUND')

      if (settlement.status !== SettlementStatus.PENDING)
        throw new Error('SETTLEMENT_ALREADY_PROCESSED')

      const netAmount = new Prisma.Decimal(settlement.netAmount)

      if (netAmount.lte(0))
        throw new Error('INVALID_SETTLEMENT_AMOUNT')

      // 3️⃣ Atualizar status
      const updated = await tx.partnerSettlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.PAID,
          paidAt: new Date()
        }
      })

      // 4️⃣ Registrar despesa da empresa
      await tx.companyExpense.create({
        data: {
          type: ExpenseType.PARTNER_PAYOUT,
          amount: netAmount,
          reference: `SETTLEMENT_${settlement.id}`,
          description: `Liquidação do parceiro ${settlement.partner.name}`
        }
      })

      // 5️⃣ Admin log (com Decimal seguro)
      await tx.adminLog.create({
        data: {
          adminId,
          action: 'SETTLE_PARTNER',
          entity: 'PartnerSettlement',
          entityId: settlement.id,
          metadata: {
            partnerId: settlement.partnerId,
            partnerName: settlement.partner.name,
            grossAmount: settlement.grossAmount.toString(),
            commission: settlement.commission.toString(),
            netAmount: netAmount.toString(),
            paidAt: updated.paidAt
          }
        }
      })

      return {
        success: true,
        settlementId: updated.id,
        netAmount: netAmount,
        paidAt: updated.paidAt
      }
    })
  }
}