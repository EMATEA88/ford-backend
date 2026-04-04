import { prisma } from '../../lib/prisma'

export class BankService {
  static async list() {
    return prisma.banco.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }
}
