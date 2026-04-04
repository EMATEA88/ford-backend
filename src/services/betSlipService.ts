import { prisma } from "../lib/prisma";
import { generateRealPredictions } from "./predictionService";

export const createBetSlip = async () => {
  const predictions = await generateRealPredictions();

  if (!predictions.length) {
    throw new Error("No predictions available");
  }

  let totalOdds = 1;

  // 🔥 mantém TODOS os dados (incluindo extraMarkets)
  const games = predictions.map((p) => {
    totalOdds *= p.odd;

    return {
      home: p.home,
      away: p.away,
      league: p.league,
      matchDate: p.matchDate,
      prediction: p.prediction,
      odd: p.odd,
      apiMatchId: p.apiMatchId,
      extraMarkets: p.extraMarkets,
    };
  });

  const totalOddsFormatted = parseFloat(totalOdds.toFixed(2));

  let betSlipDB: any = null;

  // 🔥 SAVE SEGURO (NÃO QUEBRA O SISTEMA)
  try {
    betSlipDB = await prisma.betSlip.create({
      data: {
        totalOdds: totalOddsFormatted,
        strategy: "AUTO_V2",
        games: {
          create: games.map((g) => ({
            home: g.home,
            away: g.away,
            league: g.league,
            matchDate: g.matchDate,
            prediction: g.prediction,
            odd: g.odd,
            apiMatchId: g.apiMatchId,
          })),
        },
      },
      include: {
        games: true,
      },
    });
  } catch (err) {
    console.error("❌ ERRO AO SALVAR NO DB:", err);
  }

  // 🔥 RETORNO INTELIGENTE (FUNCIONA COM OU SEM DB)
  return {
    ...(betSlipDB || {}),
    games, // sempre com extras
    totalOdds: totalOddsFormatted,
    strategy: "AUTO_V2",
  };
};