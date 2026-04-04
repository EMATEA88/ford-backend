import { prisma } from '../../../lib/prisma'
import {
  UserRole,
  TransactionType,
  NotificationType
} from '@prisma/client'
import { decrypt } from '../../../utils/crypto'

export class AdminUsersService {

  // ================= LIST =================
  static async list() {

    const items = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicId: true,
        phone: true,
        balance: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    })

    return {
      items: items.map(u => ({
        ...u,
        balance: Number(u.balance)
      })),
      total: items.length,
    }
  }

  // ================= DETAILS =================
  static async getById(id: number) {

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bank: true,
      recharges: true,
      withdrawals: true,
      transactions: true,
    },
  })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,

    balance: Number(user.balance),

    // 🔹 DADOS BANCÁRIOS
    bankName: user.bank?.bank || null,
    iban: user.bank?.iban ? decrypt(user.bank.iban) : null,

    // 🔹 OUTROS DADOS
    fullName: user.fullName || null,

    // 🔹 HISTÓRICO
    recharges: user.recharges,
    withdrawals: user.withdrawals,
    transactions: user.transactions
  }
}

  // ================= ROLE =================
  static async updateRole(id: number, role: UserRole, adminId: number) {

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new Error('USER_NOT_FOUND')

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
    })

    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UPDATE_ROLE',
        entity: 'User',
        entityId: id,
        metadata: {
          previousRole: user.role,
          newRole: role
        }
      }
    })

    return updated
  }

  // ================= BLOCK =================
  static async blockUser(id: number, adminId: number) {

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new Error('USER_NOT_FOUND')

    const updated = await prisma.user.update({
      where: { id },
      data: { isBlocked: true },
    })

    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'BLOCK_USER',
        entity: 'User',
        entityId: id,
        metadata: { phone: user.phone }
      }
    })

    return updated
  }

  // ================= UNBLOCK =================
  static async unblockUser(id: number, adminId: number) {

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) throw new Error('USER_NOT_FOUND')

    const updated = await prisma.user.update({
      where: { id },
      data: { isBlocked: false },
    })

    await prisma.adminLog.create({
      data: {
        adminId,
        action: 'UNBLOCK_USER',
        entity: 'User',
        entityId: id,
        metadata: { phone: user.phone }
      }
    })

    return updated
  }

  // ================= BALANCE ADJUST =================
  static async adjustBalance(
  userId: number,
  amount: number,
  action: 'ADD' | 'SUBTRACT',
  adminId: number
) {

  if (!amount || amount <= 0) {
    throw new Error('INVALID_AMOUNT')
  }

  return prisma.$transaction(async (tx) => {

    const user = await tx.user.findUnique({
      where: { id: userId },
    })

    if (!user) throw new Error('USER_NOT_FOUND')
    if (user.isBlocked) throw new Error('USER_BLOCKED')

    // 🔥 CONVERTER DECIMAL IMEDIATAMENTE
    const previousBalance = Number(user.balance)

    if (action === 'SUBTRACT' && previousBalance < amount) {
      throw new Error('INSUFFICIENT_BALANCE')
    }

    const newBalance =
      action === 'ADD'
        ? previousBalance + amount
        : previousBalance - amount

    await tx.user.update({
      where: { id: userId },
      data: {
        balance: newBalance
      },
    })

    await tx.transaction.create({
      data: {
        userId,
        type:
          action === 'ADD'
            ? TransactionType.RECHARGE
            : TransactionType.WITHDRAW,
        amount,
      },
    })

    await tx.notification.create({
      data: {
        userId,
        title:
          action === 'ADD'
            ? 'Saldo adicionado'
            : 'Saldo removido',
        message: `O seu saldo foi ${
          action === 'ADD' ? 'adicionado' : 'reduzido'
        } em ${amount} Kz`,
        type: NotificationType.SYSTEM,
      },
    })

    await tx.adminLog.create({
      data: {
        adminId,
        action: 'ADJUST_BALANCE',
        entity: 'User',
        entityId: userId,
        metadata: {
          actionType: action,
          amount,
          previousBalance,
          newBalance
        }
      }
    })

    return { balance: newBalance }
  })
}
}