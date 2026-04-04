import { prisma } from "../lib/prisma";

export const getStats = async () => {
  const total = await prisma.betSlip.count();

  const won = await prisma.betSlip.count({
    where: { status: "won" },
  });

  const lost = await prisma.betSlip.count({
    where: { status: "lost" },
  });

  const profit = await prisma.betSlip.aggregate({
    _sum: { profit: true },
  });

  return {
    total,
    won,
    lost,
    winrate: total ? ((won / total) * 100).toFixed(2) : "0",
    profit: profit._sum.profit || 0,
  };
};