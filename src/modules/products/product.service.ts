import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { CommissionService } from '../referral/commission.service'

export class ProductService {

  /* ================= LISTAGEM ================= */
  static async list() {
    return prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  /* ================= DETALHE ================= */
  static async detail(productId: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product || !product.isActive) {
      throw new Error('PRODUCT_NOT_FOUND')
    }

    return product
  }

  /* ================= COMPRA ================= */
  static async purchase(userId: number, productId: number) {

    const result = await prisma.$transaction(async (tx) => {

      const user = await tx.user.findUnique({
        where: { id: userId }
      })

      const product = await tx.product.findUnique({
        where: { id: productId }
      })

      if (!user || !product) throw new Error('NOT_FOUND')
      if (!product.isActive) throw new Error('PRODUCT_INACTIVE')

      if (Number(user.balance) < Number(product.price)) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      // 🔒 segurança
      if (Number(product.dailyRate) > 100) {
        throw new Error('INVALID_PRODUCT_RATE')
      }

      // 💰 cálculo real
      const dailyValue =
        Number(product.price) * (Number(product.dailyRate) / 100)

      // 🔥 LIMITE GLOBAL: 1 ATIVO POR PRODUTO
      const activeProduct = await tx.userProduct.findFirst({
        where: {
          userId,
          productId,
          endDate: {
            gte: new Date()
          }
        }
      })

      if (activeProduct) {
        throw new Error('PRODUCT_ALREADY_ACTIVE')
      }

      // 💳 debita saldo
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: new Prisma.Decimal(product.price)
          }
        }
      })

      // 📦 cria investimento
      const purchase = await tx.userProduct.create({
        data: {
          userId,
          productId,
          amount: new Prisma.Decimal(product.price),
          dailyRate: new Prisma.Decimal(dailyValue),
          startDate: new Date(),
          endDate: new Date(
            Date.now() + product.durationDays * 86400000
          )
        }
      })

      // 🧾 log financeiro
      await tx.transaction.create({
        data: {
          userId,
          type: 'BUY_DEBIT',
          amount: new Prisma.Decimal(product.price),
          description: `Compra produto ${product.name}`
        }
      })

      return { product, purchase }
    })

    // comissão async
    CommissionService.processFromPurchase(
      userId,
      Number(result.product.price)
    ).catch(err => {
      console.error('COMMISSION ERROR:', err)
    })

    return result
  }

  /* ================= HISTÓRICO ================= */
  static async myProducts(userId: number) {
    return prisma.userProduct.findMany({
      where: { userId },
      include: {
        product: true
      },
      orderBy: { startDate: 'desc' }
    })
  }
}