import { Request, Response } from "express"
import { z } from "zod"
import { AuthService } from "./auth.service"

const phoneSchema = z.string().min(7).max(20)
const passwordSchema = z.string().min(6).max(100)

export class AuthController {

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

      console.error("REGISTER ERROR 👉", err)

      return res.status(400).json({
        message: err?.message || "REGISTRATION_FAILED",
        raw: err // 👈 IMPORTANTE PARA DEBUG
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
        parsed.phone,
        parsed.password
      )

      return res.json(result)

    } catch (err: any) {
      console.error("LOGIN ERROR 👉", err)

      return res.status(401).json({
        message: err?.message || "INVALID_CREDENTIALS"
      })
    }
  }
}