import { Request, Response } from 'express'
import { WithdrawalService } from './withdrawal.service'
import { prisma } from '../../lib/prisma'

const ERROR_MESSAGES: Record<string, string> = {
  BANK_REQUIRED: 'Cadastre uma conta bancária antes de solicitar o levantamento',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente',
  USER_NOT_FOUND: 'Usuário não encontrado',
  INVALID_WITHDRAWAL: 'Operação inválida',
  INVALID_AMOUNT: 'Valor inválido',
  USER_BLOCKED: 'Usuário bloqueado',
  LIMIT_PER_TRANSACTION_EXCEEDED: 'Valor excede o limite máximo por retirada',
  DAILY_LIMIT_EXCEEDED: 'Limite diário de retiradas atingido',
  MONTHLY_LIMIT_EXCEEDED: 'Limite mensal de retiradas atingido'
}

export class WithdrawalController {

  static async list(req: Request, res: Response) {

  const userId = (req as any).userId

  try {

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        fee: true,
        status: true,
        createdAt: true
      }
    })

    return res.json(withdrawals)

  } catch (error) {

    return res.status(500).json({
      error: 'WITHDRAW_HISTORY_ERROR'
    })

  }
}

  /**
   * ===============================
   * CREATE WITHDRAW (SEM OTP)
   * ===============================
   */
  static async create(req: Request, res: Response) {

    const userId = (req as any).userId
    const { amount } = req.body

    try {

      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('USER_NOT_FOUND')
      }

      const withdrawal = await WithdrawalService.create(
        userId,
        Number(amount)
      )

      return res.json(withdrawal)

    } catch (err: any) {

      const message =
        ERROR_MESSAGES[err.message] ||
        'Erro ao solicitar levantamento'

      return res.status(400).json({
        error: err.message,
        message,
      })
    }
  }
}