import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

if (!global.prismaGlobal) {
  global.prismaGlobal = new PrismaClient({
    log: ["error", "warn"],
  });
}

prisma = global.prismaGlobal;

export { prisma };