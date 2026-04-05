import { prisma } from "../../lib/prisma"
import { hashPassword, comparePassword } from "../../utils/hash"
import { signToken } from "../../utils/jwt"
import { Prisma } from "@prisma/client"

/* ================= HELPERS ================= */

async function generatePublicId(): Promise<string> {
  while (true) {
    const id = Math.floor(10000000 + Math.random() * 90000000).toString()

    const exists = await prisma.user.findUnique({
      where: { publicId: id },
      select: { id: true }
    })

    if (!exists) return id
  }
}

function generateReferralCode(): string {
  const numbers1 = Math.floor(10000 + Math.random() * 90000)
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const numbers2 = Math.floor(100 + Math.random() * 900)

  return `${numbers1}${letter}${numbers2}` // EX: 12345A678
}

async function generateUniqueReferralCode(): Promise<string> {
  while (true) {
    const code = generateReferralCode()

    const exists = await prisma.user.findUnique({
      where: { referralCode: code }
    })

    if (!exists) return code
  }
}

/* ================= SERVICE ================= */

export class AuthService {

  /* ================= REGISTER ================= */

  static async register(
    phone: string,
    password: string,
    referralCode: string
  ) {

    const normalizedPhone = phone.trim()

    const normalizedReferral = referralCode.trim().toUpperCase()

    if (!normalizedReferral) {
      throw new Error("REFERRAL_REQUIRED")
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.$transaction(async (tx) => {

      /* ================= DUPLICATE ================= */

      const exists = await tx.user.findUnique({
        where: { phone: normalizedPhone }
      })

      if (exists) {
        throw new Error("USER_ALREADY_EXISTS")
      }

      /* ================= REFERRAL ================= */

      const inviter = await tx.user.findUnique({
        where: { referralCode: normalizedReferral }
      })

      if (!inviter) {
        throw new Error("INVALID_REFERRAL_CODE")
      }

      /* ================= ANTI SELF REFERRAL ================= */

      if (inviter.phone === normalizedPhone) {
        throw new Error("INVALID_REFERRAL_CODE")
      }

      const myReferralCode = await generateUniqueReferralCode()

      const BONUS = new Prisma.Decimal(100)

      const newUser = await tx.user.create({
        data: {
          phone: normalizedPhone,
          password: hashedPassword,
          publicId: await generatePublicId(),
          referralCode: myReferralCode,
          referredByCode: normalizedReferral,
          balance: BONUS
        }
      })

      /* ================= BONUS ================= */

      await tx.ledgerEntry.create({
        data: {
          userId: newUser.id,
          type: 'CREDIT',
          amount: BONUS,
          balanceBefore: new Prisma.Decimal(0),
          balanceAfter: BONUS,
          reference: `BONUS-${newUser.id}`,
          description: 'Bônus de registo'
        }
      })

      /* ================= NÍVEL 1 ================= */

      await tx.referral.create({
        data: {
          inviterId: inviter.id,
          invitedId: newUser.id,
          level: 1
        }
      })

      /* ================= NÍVEIS 2 E 3 ================= */

      let current = inviter

      for (let i = 1; i < 3; i++) {

        if (!current.referredByCode) break

        const next = await tx.user.findUnique({
          where: {
            referralCode: current.referredByCode
          }
        })

        if (!next) break

        await tx.referral.create({
          data: {
            inviterId: next.id,
            invitedId: newUser.id,
            level: i + 1
          }
        })

        current = next
      }

      return newUser
    })

    const token = signToken({
      id: user.id,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
        role: user.role
      }
    }
  }

  /* ================= LOGIN ================= */

  static async login(phone: string, password: string) {

    const normalizedPhone = phone.trim()

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    })

    const fakeHash = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8D9xQvK8yP0C1FQj0nW8YJ0h1m2X6K"
    const passwordToCompare = user ? user.password : fakeHash

    const valid = await comparePassword(password, passwordToCompare)

    if (!user || !valid || user.isBlocked) {
      throw new Error("INVALID_CREDENTIALS")
    }

    const token = signToken({
      id: user.id,
      role: user.role,
    })

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        referralCode: user.referralCode,
        role: user.role
      }
    }
  }
}