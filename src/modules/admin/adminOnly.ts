import { Request, Response, NextFunction } from "express"
import { prisma } from "../../lib/prisma"

export async function adminOnly(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {

    const userId = (req as any).userId
    const roleFromAuth = (req as any).role

    // 🔒 1. Garantir que passou pelo authMiddleware
    if (!userId) {
      return res.status(401).json({
        error: "UNAUTHENTICATED",
      })
    }

    // 🔒 2. Se role já for ADMIN, validamos rapidamente
    if (roleFromAuth === "ADMIN") {
      return next()
    }

    // 🔐 3. Fallback: verificar direto no banco (double check)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isBlocked: true
      }
    })

    if (!user) {
      return res.status(401).json({
        error: "INVALID_USER",
      })
    }

    if (user.isBlocked) {
      return res.status(403).json({
        error: "USER_BLOCKED",
      })
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        error: "ADMIN_ONLY",
      })
    }

    // 🔄 Atualiza role no request para evitar nova consulta
    ;(req as any).role = user.role

    return next()

  } catch (err) {

    console.error("[ADMIN_ONLY_ERROR]", err)

    return res.status(500).json({
      error: "ADMIN_AUTH_ERROR",
    })
  }
}