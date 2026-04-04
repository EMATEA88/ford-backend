import { prisma } from "../lib/prisma";
import { getFinishedMatches } from "./footballApiService";

export const updateResults = async () => {
  const slips = await prisma.betSlip.findMany({
    where: { status: "pending" },
    include: { games: true },
  });

  const matches = await getFinishedMatches();

  for (const slip of slips) {
    console.log("📦 Slip:", slip.id);

    let allWon = true;
    let hasFinishedGames = false;

    for (const game of slip.games) {
      console.log("🔎 Jogo:", game.home, "vs", game.away);

      const match = matches.find(
        (m: any) => m.idEvent === game.apiMatchId
      );

      if (!match) {
        console.log("❌ Match não encontrado");
        continue;
      }

      // 🔥 TheSportsDB usa esses campos
      const homeScore = Number(match.intHomeScore);
      const awayScore = Number(match.intAwayScore);

      // ❌ jogo ainda não terminou
      if (isNaN(homeScore) || isNaN(awayScore)) {
        console.log("⏳ Jogo não finalizado");
        continue;
      }

      hasFinishedGames = true;

      let result = "";

      if (homeScore > awayScore) result = "CASA";
      else if (awayScore > homeScore) result = "FORA";
      else result = "EMPATE";

      const won = result === game.prediction;

      console.log(`📊 ${homeScore}-${awayScore} → ${result}`);

      await prisma.betGame.update({
        where: { id: game.id },
        data: {
          result,
          status: won ? "won" : "lost",
          score: `${homeScore}-${awayScore}`,
        },
      });

      if (!won) allWon = false;
    }

    // 🔥 só fecha slip se tiver jogo finalizado
    if (hasFinishedGames) {
      await prisma.betSlip.update({
        where: { id: slip.id },
        data: {
          status: allWon ? "won" : "lost",
          profit: allWon ? slip.totalOdds - 1 : -1,
        },
      });

      console.log(
        "✅ Slip atualizado:",
        allWon ? "WIN" : "LOSS"
      );
    }
  }
};