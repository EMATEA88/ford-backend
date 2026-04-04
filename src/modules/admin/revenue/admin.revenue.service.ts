import { prisma } from '../../../lib/prisma'
import { RevenueType } from '@prisma/client'

export class AdminRevenueService {

  // =============================
  // LISTAR RECEITAS
  // =============================
  static async list(params: any) {

    const { type, startDate, endDate, page = 1, limit = 20 } = params

    const where: any = {}

    if (type)
      where.type = type as RevenueType

    if (startDate || endDate) {
      where.createdAt = {}

      if (startDate)
        where.createdAt.gte = new Date(startDate)

      if (endDate)
        where.createdAt.lte = new Date(endDate)
    }

    const skip = (Number(page) - 1) * Number(limit)

    const [data, total] = await Promise.all([
      prisma.companyRevenue.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.companyRevenue.count({ where })
    ])

    return {
      data,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    }
  }

  // =============================
  // STATS GERAIS
  // =============================
  static async stats() {

    const totalRevenue = await prisma.companyRevenue.aggregate({
      _sum: { amount: true }
    })

    const grouped = await prisma.companyRevenue.groupBy({
      by: ['type'],
      _sum: { amount: true }
    })

    return {
      total: totalRevenue._sum.amount ?? 0,
      byType: grouped
    }
  }

  // =============================
  // RECEITA POR PERÍODO
  // =============================
  static async monthly(year: number) {

    const data = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        EXTRACT(MONTH FROM "createdAt") AS month,
        SUM(amount) AS total
      FROM "CompanyRevenue"
      WHERE EXTRACT(YEAR FROM "createdAt") = ${year}
      GROUP BY month
      ORDER BY month ASC
    `)

    return data
  }
}
