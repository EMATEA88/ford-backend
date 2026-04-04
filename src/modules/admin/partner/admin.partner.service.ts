import { prisma } from '../../../lib/prisma'
import { Prisma } from '@prisma/client'

export class AdminPartnerService {

  /* ===============================
     LIST PARTNERS + FINANCIAL DATA
  ================================ */
  static async listPartners() {

    const partners = await prisma.partner.findMany({
      include: {
        services: {
          include: {
            requests: {
              where: { status: 'COMPLETED' }
            }
          }
        },
        settlements: true
      }
    })

    return partners.map((partner) => {

      let totalGross = new Prisma.Decimal(0)
      let totalCommission = new Prisma.Decimal(0)
      let totalPaid = new Prisma.Decimal(0)
      let totalPending = new Prisma.Decimal(0)

      for (const service of partner.services) {

        let serviceGross = new Prisma.Decimal(0)

        for (const r of service.requests) {
          serviceGross = serviceGross.add(r.amount)
        }

        totalGross = totalGross.add(serviceGross)

        const commissionRate = new Prisma.Decimal(service.commission).div(100)
        const commissionValue = serviceGross.mul(commissionRate)

        totalCommission = totalCommission.add(commissionValue)
      }

      for (const s of partner.settlements) {
        if (s.status === 'PAID') {
          totalPaid = totalPaid.add(s.netAmount)
        }

        if (s.status === 'PENDING') {
          totalPending = totalPending.add(s.netAmount)
        }
      }

      const totalNet = totalGross.sub(totalCommission)

      return {
        id: partner.id,
        name: partner.name,
        contact: partner.contact,
        email: partner.email,
        isActive: partner.isActive,
        financial: {
          totalGross,
          totalCommission,
          totalNet,
          totalPaid,
          totalPending
        }
      }
    })
  }

  /* ===============================
     GENERATE SETTLEMENT (MANUAL)
  ================================ */
  static async generateSettlement(partnerId: number) {

    const services = await prisma.service.findMany({
      where: { partnerId },
      include: {
        requests: {
          where: { status: 'COMPLETED' }
        }
      }
    })

    const createdSettlements = []

    for (const service of services) {

      let gross = new Prisma.Decimal(0)

      for (const r of service.requests) {
        gross = gross.add(r.amount)
      }

      if (gross.eq(0)) continue

      const commissionRate = new Prisma.Decimal(service.commission).div(100)
      const commissionValue = gross.mul(commissionRate)
      const net = gross.sub(commissionValue)

      const settlement = await prisma.partnerSettlement.create({
        data: {
          partnerId,
          serviceId: service.id,
          grossAmount: gross,
          commission: commissionValue,
          netAmount: net
        }
      })

      createdSettlements.push(settlement)
    }

    return createdSettlements
  }

  /* ===============================
     LIST SETTLEMENTS
  ================================ */
  static async getSettlements(partnerId: number) {
    return prisma.partnerSettlement.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' }
    })
  }

  /* ===============================
     MARK AS PAID
  ================================ */
  static async markAsPaid(settlementId: number) {

    const settlement = await prisma.partnerSettlement.update({
      where: { id: settlementId },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    })

    await prisma.companyExpense.create({
      data: {
        type: 'PARTNER_PAYOUT',
        amount: settlement.netAmount,
        reference: `Settlement #${settlement.id}`
      }
    })

    return settlement
  }
}