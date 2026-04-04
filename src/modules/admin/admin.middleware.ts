import { Request, Response, NextFunction } from "express"

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {

  const user = (req as any).user
  const role = (req as any).role

  // 🔐 Não autenticado
  if (!user) {
    return res.status(401).json({
      error: "UNAUTHENTICATED",
    })
  }

  // 🔒 Usuário bloqueado (double safety)
  if (user.isBlocked) {
    return res.status(403).json({
      error: "USER_BLOCKED",
    })
  }

  // 🛡 Não é admin
  if (role !== "ADMIN") {
    return res.status(403).json({
      error: "ADMIN_ONLY",
    })
  }

  return next()
}