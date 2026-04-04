import { Prisma } from "@prisma/client";

export const WITHDRAW_LIMITS = {
  PER_TRANSACTION: new Prisma.Decimal(5000000), // 🔥 5 milhões por saque
  DAILY: new Prisma.Decimal(5000000),           // 🔥 opcional: igual ao limite diário
  MONTHLY: new Prisma.Decimal(10000000),
};