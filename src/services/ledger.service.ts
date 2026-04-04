import { prisma } from "../lib/prisma"
import {
  LedgerType,
  TransactionType,
  PaymentStatus,
  Prisma
} from "@prisma/client"

interface LedgerOperation {
  userId: number
  amount: number | Prisma.Decimal
  type: LedgerType
  transactionType: TransactionType
  description?: string
  reference?: string
  idempotencyKey?: string
  metadata?: any
}

export class LedgerService {

  static async execute(operation: LedgerOperation) {

    if (!operation.amount)
      throw new Error("INVALID_AMOUNT")

    const decimalAmount = new Prisma.Decimal(operation.amount)

    if (decimalAmount.lte(0))
      throw new Error("INVALID_AMOUNT")

    return prisma.$transaction(async (tx) => {

      // 🔐 Idempotência forte
      if (operation.idempotencyKey) {
        const existing = await tx.transaction.findUnique({
          where: { idempotencyKey: operation.idempotencyKey }
        })
        if (existing) return existing
      }

      const user = await tx.user.findUnique({
        where: { id: operation.userId },
        select: { balance: true }
      })

      if (!user)
        throw new Error("USER_NOT_FOUND")

      const currentBalance = new Prisma.Decimal(user.balance)
      let newBalance = currentBalance

      if (operation.type === LedgerType.DEBIT) {
        if (currentBalance.lt(decimalAmount))
          throw new Error("INSUFFICIENT_BALANCE")

        newBalance = currentBalance.sub(decimalAmount)
      }

      if (operation.type === LedgerType.CREDIT) {
        newBalance = currentBalance.add(decimalAmount)
      }

      const transaction = await tx.transaction.create({
        data: {
          userId: operation.userId,
          type: operation.transactionType,
          amount: decimalAmount,
          status: PaymentStatus.PAID,
          description: operation.description,
          reference: operation.reference,
          idempotencyKey: operation.idempotencyKey,
          metadata: operation.metadata,
          processedAt: new Date()
        }
      })

      await tx.ledgerEntry.create({
        data: {
          userId: operation.userId,
          type: operation.type,
          amount: decimalAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          transactionId: transaction.id,
          reference: operation.reference,
          description: operation.description,
          metadata: operation.metadata
        }
      })

      await tx.user.update({
        where: { id: operation.userId },
        data: { balance: newBalance }
      })

      return transaction
    })
  }

  static async credit(
    userId: number,
    amount: number | Prisma.Decimal,
    description?: string
  ) {
    return this.execute({
      userId,
      amount,
      type: LedgerType.CREDIT,
      transactionType: TransactionType.RECHARGE,
      description
    })
  }

  static async debit(
    userId: number,
    amount: number | Prisma.Decimal,
    description?: string
  ) {
    return this.execute({
      userId,
      amount,
      type: LedgerType.DEBIT,
      transactionType: TransactionType.WITHDRAW,
      description
    })
  }
}