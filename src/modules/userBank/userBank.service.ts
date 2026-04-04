import { z } from "zod"
import { prisma } from "../../lib/prisma"

const bankSchema = z.object({
  name: z.string().min(2).max(100),
  bank: z.string().min(2).max(100),
  iban: z.string().min(10).max(34)
})

export class UserBankService {

  static async get(userId: number) {

    const bank = await prisma.userBank.findUnique({
      where: { userId }
    })

    if (!bank) return null

    return {
      ...bank
    }
  }

  static async save(userId: number, data: unknown) {

    const parsed = bankSchema.parse(data)

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) throw new Error("USER_NOT_FOUND")

    const normalizedIban = parsed.iban
      .replace(/\s+/g, "")
      .toUpperCase()

    return prisma.$transaction(async (tx) => {

      const existing = await tx.userBank.findUnique({
        where: { userId }
      })

      if (existing && existing.iban !== normalizedIban) {

        const lastChanges = await tx.adminLog.count({
          where: {
            adminId: userId,
            action: "UPDATE_USER_BANK",
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })

        if (lastChanges >= 2)
          throw new Error("SUSPICIOUS_ACTIVITY")

        await tx.notification.create({
          data: {
            userId,
            title: "Alteração de conta bancária",
            message: "Sua conta bancária foi alterada. Se não foi você, contacte o suporte.",
            type: "WARNING"
          }
        })
      }

      const result = await tx.userBank.upsert({
        where: { userId },
        update: {
          name: parsed.name.trim(),
          bank: parsed.bank.trim(),
          iban: normalizedIban
        },
        create: {
          userId,
          name: parsed.name.trim(),
          bank: parsed.bank.trim(),
          iban: normalizedIban
        }
      })

      await tx.adminLog.create({
        data: {
          adminId: userId,
          action: existing ? "UPDATE_USER_BANK" : "CREATE_USER_BANK",
          entity: "UserBank",
          entityId: result.id,
          metadata: {
            ibanLast4: normalizedIban.slice(-4)
          }
        }
      })

      return {
        id: result.id,
        name: result.name,
        bank: result.bank,
        iban: normalizedIban
      }
    })
  }
}