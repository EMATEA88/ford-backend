import { prisma } from "../../../lib/prisma"
import { VerificationStatus } from "@prisma/client"

export class AdminKYCService {

  static async list(page = 1, limit = 20) {

    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.userVerification.findMany({
        skip,
        take: limit,
        orderBy: { submittedAt: "desc" },
        include: {
          user: {
            select: { id: true, phone: true }
          }
        }
      }),
      prisma.userVerification.count()
    ])

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  static async approve(userId: number, adminId: number) {

    // 🔎 Buscar KYC para obter o nome aprovado
    const verification = await prisma.userVerification.findUnique({
      where: { userId }
    })

    if (!verification) {
      throw new Error("KYC_NOT_FOUND")
    }

    // 1️⃣ Atualizar status da verificação
    await prisma.userVerification.update({
      where: { userId },
      data: {
        status: VerificationStatus.VERIFIED,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    })

    // 2️⃣ Atualizar usuário com nome oficial e status
    await prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        fullName: verification.fullName // 👈 sincronização automática
      }
    })

    return { success: true }
  }

  static async reject(
    userId: number,
    adminId: number,
    reason: string
  ) {

    await prisma.userVerification.update({
      where: { userId },
      data: {
        status: VerificationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: reason
      }
    })

    return { success: true }
  }
}