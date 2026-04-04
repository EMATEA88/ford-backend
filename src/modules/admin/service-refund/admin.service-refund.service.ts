import { prisma } from '../../../lib/prisma'
import { ServiceStatus } from '@prisma/client'
import { ServiceRefundService } from '../../service/service-refund.service'

export class AdminServiceRefundService {

  // =============================
  // LISTAR REQUESTS CANCELÁVEIS
  // =============================
  static async list(status?: ServiceStatus) {

    const where: any = {}

    if (status)
      where.status = status

    const data = await prisma.serviceRequest.findMany({
      where,
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
            partner: true
          }
        }
      }
    })

    return { data }
  }

  // =============================
  // STATS
  // =============================
  static async stats() {

    const [inProgress, completed, rejected] =
      await Promise.all([
        prisma.serviceRequest.count({
          where: { status: ServiceStatus.IN_PROGRESS }
        }),
        prisma.serviceRequest.count({
          where: { status: ServiceStatus.COMPLETED }
        }),
        prisma.serviceRequest.count({
          where: { status: ServiceStatus.REJECTED }
        })
      ])

    return {
      inProgress,
      completed,
      rejected
    }
  }

  // =============================
  // EXECUTAR REFUND
  // =============================
  static async refund(
    requestId: number,
    adminId: number
  ) {

    return ServiceRefundService.cancelAndRefund(
      requestId,
      adminId
    )
  }

}
