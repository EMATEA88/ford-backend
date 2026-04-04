import { prisma } from "../../../lib/prisma"
import { SettlementStatus, ExpenseType, Prisma } from "@prisma/client"

export class AdminSettlementService {

  // =============================
  // LIST
  // =============================
  static async list(params: any) {

    const { status, partnerId, page = 1, limit = 20 } = params

    const where: any = {}

    if (status)
      where.status = status

    if (partnerId)
      where.partnerId = Number(partnerId)

    const skip = (Number(page) - 1) * Number(limit)

    const [data, total] = await Promise.all([
      prisma.partnerSettlement.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          service: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.partnerSettlement.count({ where })
    ])

    return {
      data,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    }
  }

  // =============================
  // DETAILS
  // =============================
  static async details(id: number) {

    if (!id)
      throw new Error("INVALID_ID")

    const settlement = await prisma.partnerSettlement.findUnique({
      where: { id },
      include: {
        partner: true,
        service: true
      }
    })

    if (!settlement)
      throw new Error("SETTLEMENT_NOT_FOUND")

    return settlement
  }

  // =============================
  // STATS
  // =============================
  static async stats() {

    const pendingTotal = await prisma.partnerSettlement.aggregate({
      where: { status: SettlementStatus.PENDING },
      _sum: { netAmount: true }
    })

    const paidTotal = await prisma.partnerSettlement.aggregate({
      where: { status: SettlementStatus.PAID },
      _sum: { netAmount: true }
    })

    const pendingCount = await prisma.partnerSettlement.count({
      where: { status: SettlementStatus.PENDING }
    })

    const paidCount = await prisma.partnerSettlement.count({
      where: { status: SettlementStatus.PAID }
    })

    return {
      totalPendingAmount: pendingTotal._sum.netAmount ?? new Prisma.Decimal(0),
      totalPaidAmount: paidTotal._sum.netAmount ?? new Prisma.Decimal(0),
      pendingCount,
      paidCount
    }
  }

  // =============================
  // PAY PARTNER
  // =============================
  static async settle(
    settlementId: number,
    adminId: number
  ) {

    if (!settlementId || settlementId <= 0)
      throw new Error("INVALID_SETTLEMENT_ID")

    if (!adminId)
      throw new Error("INVALID_ADMIN")

    return prisma.$transaction(async (tx) => {

      const settlement = await tx.partnerSettlement.findUnique({
        where: { id: settlementId },
        include: { partner: true }
      })

      if (!settlement)
        throw new Error("SETTLEMENT_NOT_FOUND")

      if (settlement.status !== SettlementStatus.PENDING)
        throw new Error("SETTLEMENT_ALREADY_PROCESSED")

      // 🔥 CORREÇÃO DECIMAL
      if (settlement.netAmount.lte(new Prisma.Decimal(0)))
        throw new Error("INVALID_SETTLEMENT_AMOUNT")

      // 1️⃣ Update status
      const updated = await tx.partnerSettlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.PAID,
          paidAt: new Date()
        }
      })

      // 2️⃣ Register company expense
      await tx.companyExpense.create({
        data: {
          type: ExpenseType.PARTNER_PAYOUT,
          amount: settlement.netAmount,
          reference: `SETTLEMENT_${settlement.id}`,
          description: `Pagamento ao parceiro ${settlement.partner.name}`
        }
      })

      // 3️⃣ Admin log
      await tx.adminLog.create({
        data: {
          adminId,
          action: "SETTLEMENT_PAID",
          entity: "PartnerSettlement",
          entityId: settlementId,
          metadata: {
            partnerId: settlement.partnerId,
            partnerName: settlement.partner.name,
            grossAmount: settlement.grossAmount,
            commission: settlement.commission,
            netAmount: settlement.netAmount
          }
        }
      })

      return {
        success: true,
        settlementId: updated.id,
        netAmount: settlement.netAmount,
        paidAt: updated.paidAt
      }

    })
  }

}