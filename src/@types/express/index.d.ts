import { UserRole } from '@prisma/client'

declare global {
  namespace Express {
    interface User {
      id: number
      role: UserRole
    }

    interface Request {
      user?: User
    }
  }
}

export {}
