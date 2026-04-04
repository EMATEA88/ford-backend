import { Request, Response } from 'express'
import { prisma } from '../../../lib/prisma'

export class AdminLogController {

  static async list(req: Request, res: Response) {
    try {

      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 20
      const action = req.query.action as string | undefined
      const entity = req.query.entity as string | undefined

      const skip = (page - 1) * limit

      const where: any = {}

      if (action) where.action = action
      if (entity) where.entity = entity

      const [logs, total] = await Promise.all([
        prisma.adminLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            admin: {
              select: {
                id: true,
                phone: true
              }
            }
          }
        }),
        prisma.adminLog.count({ where })
      ])

      return res.json({
        items: logs,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      })

    } catch (error: any) {
      return res.status(400).json({
        message: error.message
      })
    }
  }
}