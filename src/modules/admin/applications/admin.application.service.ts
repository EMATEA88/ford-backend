import { prisma } from '../../../lib/prisma'
import { ApplicationService } from '../../aplication/application.service'
import {
  ApplicationStatus,
  Prisma
} from '@prisma/client'

const MAX_LIMIT = 100

export class AdminApplicationService {

  /* =========================================
     LIST
  ========================================= */

  static async list(
    page = 1,
    limit = 20,
    status?: ApplicationStatus
  ) {

    // 🔐 Sanitização
    page = Number(page)
    limit = Number(limit)

    if (!Number.isInteger(page) || page <= 0) page = 1
    if (!Number.isInteger(limit) || limit <= 0) limit = 20
    if (limit > MAX_LIMIT) limit = MAX_LIMIT

    const skip = (page - 1) * limit

    const where =
      status && Object.values(ApplicationStatus).includes(status)
        ? { status }
        : {}

    const [data, total] = await Promise.all([

      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              phone: true,
              publicId: true,
              balance: true,
              frozenBalance: true
            }
          }
        }
      }),

      prisma.application.count({ where })

    ])

    return {
      items: data.map(app => ({
        ...app,
        amount: app.amount.toString(),
        expectedProfit: app.expectedProfit.toString(),
        totalReturn: app.totalReturn.toString()
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  /* =========================================
     DETAILS
  ========================================= */

  static async details(id: number) {

    id = Number(id)

    if (!Number.isInteger(id) || id <= 0)
      throw new Error('INVALID_APPLICATION_ID')

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            publicId: true,
            balance: true,
            frozenBalance: true
          }
        }
      }
    })

    if (!application)
      throw new Error('APPLICATION_NOT_FOUND')

    return {
      ...application,
      amount: application.amount.toString(),
      expectedProfit: application.expectedProfit.toString(),
      totalReturn: application.totalReturn.toString()
    }
  }

  /* =========================================
     STATS
  ========================================= */

  static async stats() {

    const [
      activeSum,
      maturedSum,
      cancelledSum,
      activeCount,
      maturedCount,
      cancelledCount
    ] = await Promise.all([

      prisma.application.aggregate({
        where: { status: ApplicationStatus.ACTIVE },
        _sum: { amount: true }
      }),

      prisma.application.aggregate({
        where: { status: ApplicationStatus.MATURED },
        _sum: { totalReturn: true }
      }),

      prisma.application.aggregate({
        where: { status: ApplicationStatus.CANCELLED },
        _sum: { amount: true }
      }),

      prisma.application.count({
        where: { status: ApplicationStatus.ACTIVE }
      }),

      prisma.application.count({
        where: { status: ApplicationStatus.MATURED }
      }),

      prisma.application.count({
        where: { status: ApplicationStatus.CANCELLED }
      })

    ])

    return {
      totalActive: (activeSum._sum.amount ?? new Prisma.Decimal(0)).toString(),
      totalPaid: (maturedSum._sum.totalReturn ?? new Prisma.Decimal(0)).toString(),
      totalCancelled: (cancelledSum._sum.amount ?? new Prisma.Decimal(0)).toString(),

      activeCount,
      maturedCount,
      cancelledCount
    }
  }

  /* =========================================
     CANCEL (delegado)
  ========================================= */

  static async cancel(
    applicationId: number,
    adminId: number
  ) {

    applicationId = Number(applicationId)

    if (!Number.isInteger(applicationId) || applicationId <= 0)
      throw new Error('INVALID_APPLICATION_ID')

    if (!adminId)
      throw new Error('INVALID_ADMIN')

    return ApplicationService.cancelByAdmin(
      applicationId,
      adminId
    )
  }
}