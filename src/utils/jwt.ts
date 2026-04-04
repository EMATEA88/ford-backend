import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET as string

// ============================
// PAYLOAD TYPE
// ============================
export interface TokenPayload {
  id: number
  role: "USER" | "ADMIN"
}

// ============================
// SIGN TOKEN
// ============================
export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  })
}

// ============================
// VERIFY TOKEN
// ============================
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}
