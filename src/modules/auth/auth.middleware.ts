import { Request, Response, NextFunction } from "express"
import { verifyToken } from "../../utils/jwt"
import { prisma } from "../../lib/prisma"

interface TokenPayload {
  id: number
  role?: string
  iat?: number
  exp?: number
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization

    if (!header || typeof header !== "string") {
      return res.status(401).json({ error: "UNAUTHORIZED" })
    }

    const parts = header.trim().split(" ")

    if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
      return res.status(401).json({ error: "UNAUTHORIZED" })
    }

    const token = parts[1].trim()

    if (token.length < 20) {
      return res.status(401).json({ error: "UNAUTHORIZED" })
    }

    const payload = verifyToken(token) as TokenPayload

    if (!payload || typeof payload.id !== "number") {
      return res.status(401).json({ error: "UNAUTHORIZED" })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        role: true,
        isBlocked: true,
      },
    })

    if (!user || user.isBlocked) {
      return res.status(403).json({ error: "ACCESS_DENIED" })
    }

    // 🔐 USER DATA
    ;(req as any).user = user
    ;(req as any).userId = user.id
    ;(req as any).role = user.role

    // 🔥 IDENTIFICA ORIGEM (ADMIN / MOBILE)
    ;(req as any).appType = req.headers['x-app'] || 'mobile'

    return next()

  } catch {
    return res.status(401).json({ error: "UNAUTHORIZED" })
  }
}