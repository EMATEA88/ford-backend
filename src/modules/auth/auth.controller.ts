import { Request, Response } from "express"
import { z } from "zod"
import { AuthService } from "./auth.service"

/* ================= VALIDATION ================= */

const phoneSchema = z
  .string()
  .min(7)
  .max(20)
  .regex(/^[0-9+]+$/, "INVALID_PHONE")

const passwordSchema = z
  .string()
  .min(6)
  .max(100)

const referralSchema = z
  .string()
  .min(6)
  .max(20)

/* ================= CONTROLLER ================= */

export class AuthController {

  static async register(req: Request, res: Response) {
    try {

      const parsed = z.object({
        phone: phoneSchema,
        password: passwordSchema,
        referralCode: referralSchema
      }).parse(req.body)

      const result = await AuthService.register(
        parsed.phone.trim(),
        parsed.password,
        parsed.referralCode.trim().toUpperCase()
      )

      return res.status(201).json(result)

    } catch (err: any) {

      console.error("REGISTER ERROR 👉", err.message)

      return res.status(400).json({
        message: err?.message || "REGISTRATION_FAILED"
      })
    }
  }

  static async login(req: Request, res: Response) {
    try {

      const parsed = z.object({
        phone: phoneSchema,
        password: passwordSchema
      }).parse(req.body)

      const result = await AuthService.login(
        parsed.phone.trim(),
        parsed.password
      )

      return res.json(result)

    } catch (err: any) {

      console.error("LOGIN ERROR 👉", err.message)

      return res.status(401).json({
        message: err?.message || "INVALID_CREDENTIALS"
      })
    }
  }
}