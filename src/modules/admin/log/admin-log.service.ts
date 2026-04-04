import { prisma } from '../../../lib/prisma'

export class AdminLogService {

  static async log(
    adminId: number,
    action: string,
    entity?: string,
    entityId?: number,
    metadata?: any
  ) {
    return prisma.adminLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId,
        metadata
      }
    })
  }
}
