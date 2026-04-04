import { prisma } from '../../../lib/prisma'
import { ServiceService } from '../../service/service.service'
import { ServiceStatus } from '@prisma/client'

export class AdminServiceService {

  // =============================
  // LIST SERVICE REQUESTS (ADMIN)
  // =============================
  static async list(params: any) {

    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.max(1, Number(params.limit) || 20)

    const where: any = {}

    if (params.status) {
      if (Object.values(ServiceStatus).includes(params.status)) {
        where.status = params.status
      }
    }

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([

      prisma.serviceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              publicId: true
            }
          },
          plan: {
            include: {
              partner: true,
              service: true
            }
          }
        }
      }),

      prisma.serviceRequest.count({ where })

    ])

    return {
      data,
      total,
      page,
      pages: Math.ceil(total / limit) || 1
    }
  }

  // =============================
  // COMPLETE REQUEST (ADMIN)
  // =============================
  static async complete(
    requestId: number,
    adminId: number
  ) {

    if (!requestId || !adminId) {
      throw new Error('INVALID_PARAMETERS')
    }

    return ServiceService.completeRequest(
      requestId,
      adminId
    )
  }

}
