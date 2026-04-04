import { Router } from "express"
import rateLimit from "express-rate-limit"
import { AuthController } from "./auth.controller"

export const authRoutes = Router()

/* ================= RATE LIMIT CONFIG ================= */

// Limite geral (registro)
const generalAuthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_REQUESTS" },
})

// Limite forte para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_LOGIN_ATTEMPTS" },
})

/* ================= ROUTES ================= */

// ✅ REGISTER (com referral)
authRoutes.post(
  "/register",
  generalAuthLimiter,
  AuthController.register
)

// ✅ LOGIN
authRoutes.post(
  "/login",
  loginLimiter,
  AuthController.login
)