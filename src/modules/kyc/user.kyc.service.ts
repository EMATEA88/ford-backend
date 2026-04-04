import { prisma } from "../../lib/prisma"
import { VerificationStatus } from "@prisma/client"

export class UserKYCService {

  static async submit(
    userId: number,
    fullName: string,
    frontImage: string,
    backImage: string,
    selfieImage: string
  ) {

    if (!fullName || fullName.trim().length < 5)
      throw new Error("FULL_NAME_REQUIRED")

    if (!frontImage || !backImage || !selfieImage)
      throw new Error("ALL_IMAGES_REQUIRED")

    const existing = await prisma.userVerification.findUnique({
      where: { userId }
    })

    if (existing && existing.status === VerificationStatus.VERIFIED)
      throw new Error("ALREADY_VERIFIED")

    if (existing && existing.status === VerificationStatus.PENDING)
      throw new Error("VERIFICATION_ALREADY_PENDING")

    if (existing) {
      await prisma.userVerification.update({
        where: { userId },
        data: {
          fullName: fullName.trim(),
          frontImage,
          backImage,
          selfieImage,
          status: VerificationStatus.PENDING,
          submittedAt: new Date(),
          rejectionReason: null
        }
      })
    } else {
      await prisma.userVerification.create({
        data: {
          userId,
          fullName: fullName.trim(),
          frontImage,
          backImage,
          selfieImage,
          status: VerificationStatus.PENDING
        }
      })
    }

    return { success: true }
  }

  static async status(userId: number) {

    const verification =
      await prisma.userVerification.findUnique({
        where: { userId }
      })

    if (!verification)
      return { status: "NOT_SUBMITTED" }

    return {
      status: verification.status,
      submittedAt: verification.submittedAt,
      rejectionReason: verification.rejectionReason
    }
  }

}