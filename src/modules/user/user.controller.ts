import { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'

export class UserController {

  static async me(req: Request, res: Response) {
    try {

      const userId = (req as any).userId

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          verification: true,
          bank: true
        }
      })

      if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND' })
      }

      return res.json({
        id: user.id,
        publicId: user.publicId,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        balance: user.balance,
        referralCode: user.referralCode, // ✅ CORRETO
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        verification: user.verification,
        bank: user.bank
      })

    } catch (error) {
      console.error('ME_ERROR:', error)
      return res.status(500).json({ error: 'INTERNAL_ERROR' })
    }
  }

}