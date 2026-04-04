import { Request, Response } from "express"
import { z } from "zod"
import { AuthService } from "./auth.service"

/* ================= SCHEMAS ================= */

const phoneSchema = z.string().min(7).max(20)
const passwordSchema = z.string().min(6).max(100)

export class AuthController {

  /* ================= REGISTER ================= */

  static async register(req: Request, res: Response) {
    try {

      const parsed = z.object({
        phone: phoneSchema,
        password: passwordSchema,
        referralCode: z.string()
      }).parse(req.body)

      const result = await AuthService.register(
        parsed.phone,
        parsed.password,
        parsed.referralCode
      )

      return res.status(201).json(result)

    } catch (err: any) {

      const message =
        err?.message === "REFERRAL_REQUIRED"
          ? "Convite obrigatório"
          : err?.message === "INVALID_REFERRAL_CODE"
          ? "Código inválido"
          : err?.message === "USER_ALREADY_EXISTS"
          ? "Usuário já existe"
          : "REGISTRATION_FAILED"

      return res.status(400).json({ message })
    }
  }

  /* ================= LOGIN ================= */

  static async login(req: Request, res: Response) {
    try {

      const parsed = z.object({
        phone: phoneSchema,
        password: passwordSchema
      }).parse(req.body)

      const result = await AuthService.login(
        parsed.phone,
        parsed.password
      )

      return res.json(result)

    } catch {
      return res.status(401).json({ message: "INVALID_CREDENTIALS" })
    }
  }
}