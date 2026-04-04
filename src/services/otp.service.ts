import { prisma } from "../lib/prisma"
import { OtpType } from "@prisma/client"
import { EmailService } from "./email.service"
import bcrypt from "bcrypt"

const OTP_EXPIRATION_MINUTES = 5
const MAX_ATTEMPTS = 5
const MAX_REQUESTS_WINDOW = 3
const OTP_SALT_ROUNDS = 8

export const OtpService = {

  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  },

  async send(target: string, type: OtpType) {

    const normalized = target.toLowerCase().trim()

    console.log("=== OTP REQUEST START ===")
    console.log("TARGET:", normalized)
    console.log("TYPE:", type)

    const last10Min = new Date(Date.now() - 10 * 60 * 1000)

    const count = await prisma.otpCode.count({
      where: {
        phone: normalized,
        type,
        createdAt: { gte: last10Min }
      }
    })

    console.log("OTP REQUEST COUNT (last 10 min):", count)

    if (count >= MAX_REQUESTS_WINDOW) {
      console.log("OTP BLOCKED: MANY_REQUESTS")
      throw new Error("MANY_REQUESTS")
    }

    const code = this.generateCode()
    console.log("OTP CODE GENERATED:", code)

    const hashedCode = await bcrypt.hash(code, OTP_SALT_ROUNDS)

    await prisma.$transaction(async (tx) => {

      await tx.otpCode.updateMany({
        where: {
          phone: normalized,
          type,
          used: false
        },
        data: { used: true }
      })

      await tx.otpCode.create({
        data: {
          phone: normalized,
          code: hashedCode,
          type,
          expiresAt: new Date(
            Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000
          )
        }
      })
    })

    console.log("OTP SAVED IN DATABASE")

    try {

      console.log("SENDING OTP EMAIL...")
      await EmailService.sendOtp(normalized, code)
      console.log("OTP EMAIL SENT SUCCESSFULLY")

    } catch (error: any) {

      console.error("OTP EMAIL FAILED:", error?.message)
      throw new Error("EMAIL_SEND_FAILED")
    }

    console.log("=== OTP PROCESS END ===")

    return true
  },

  async verify(target: string, code: string, type: OtpType) {

    const normalized = target.toLowerCase().trim()

    return prisma.$transaction(async (tx) => {

      const otp = await tx.otpCode.findFirst({
        where: {
          phone: normalized,
          type,
          used: false
        },
        orderBy: { createdAt: "desc" }
      })

      if (!otp)
        throw new Error("INVALID_OTP")

      if (otp.expiresAt < new Date())
        throw new Error("OTP_EXPIRED")

      if (otp.attempts >= MAX_ATTEMPTS)
        throw new Error("OTP_BLOCKED")

      const valid = await bcrypt.compare(code, otp.code)

      if (!valid) {

        await tx.otpCode.update({
          where: { id: otp.id },
          data: { attempts: { increment: 1 } }
        })

        throw new Error("INVALID_OTP")
      }

      await tx.otpCode.update({
        where: { id: otp.id },
        data: { used: true }
      })

      return true
    })
  }
}