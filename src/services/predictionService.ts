import { getOddsMatches } from "./oddsApiService";

export const generateRealPredictions = async () => {
  const matches = await getOddsMatches();

  console.log("TOTAL MATCHES API:", matches.length);

  const selected = [];

  const now = new Date();
  const maxDate = new Date();
  maxDate.setHours(now.getHours() + 48);

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  // 🔥 ORDENA POR DATA (ESSENCIAL)
  const sortedMatches = matches.sort(
    (a: any, b: any) =>
      new Date(a.commence_time).getTime() -
      new Date(b.commence_time).getTime()
  );

  for (const m of sortedMatches) {
    const matchDate = new Date(m.commence_time);

    // 🔥 FILTRO (HOJE + 48H)
    if (matchDate < now || matchDate > maxDate) continue;

    const bookmaker = m.bookmakers?.[0];
    if (!bookmaker) continue;

    const outcomes = bookmaker.markets?.[0]?.outcomes;
    if (!outcomes) continue;

    const home = outcomes.find((o: any) => o.name === m.home_team);
    const away = outcomes.find((o: any) => o.name === m.away_team);

    if (!home || !away) continue;

    const homeOdd = home.price;
    const awayOdd = away.price;

    const prediction = homeOdd < awayOdd ? "CASA" : "FORA";
    const odd = Math.min(homeOdd, awayOdd);

    const diff = Math.abs(homeOdd - awayOdd);

    // 🎯 VALUE BET
    const impliedProbability = 1 / odd;
    const estimatedProbability = impliedProbability + diff * 0.08;
    const value = estimatedProbability - impliedProbability;

    if (value < 0.02) continue;

    let confidence = 0.5;

    if (diff < 0.3) confidence -= 0.2;
    if (diff >= 0.3 && diff < 0.7) confidence += 0.2;
    if (diff >= 0.7) confidence += 0.3;

    if (confidence < 0.5) continue;

    if (odd < 1.5 || odd > 3.0) continue;

    const avgGoals = 1 / homeOdd + 1 / awayOdd;

    const extraMarkets = {
      btts: avgGoals > 1.1 && diff < 0.7,
      overCorners: clamp(Math.round(8 + diff * 4), 8, 13),
      yellowCards: clamp(3 + Math.floor((1 - diff) * 4), 3, 7),
      redCard: diff < 0.4 && avgGoals > 1.3,
      offsides: clamp(1 + Math.floor(avgGoals * 2), 1, 4),
    };

    selected.push({
      home: m.home_team,
      away: m.away_team,
      league: m.sport_title,
      matchDate,
      prediction,
      odd: parseFloat(odd.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(2)),
      apiMatchId: m.id,
      extraMarkets,
    });

    if (selected.length >= 3) break;
  }

  // 🔥 FALLBACK INTELIGENTE (SEM ABRIL LONGE)
  if (selected.length === 0 && sortedMatches.length > 0) {
    const fallbackMatches = sortedMatches.slice(0, 5); // pega os mais próximos

    for (const m of fallbackMatches) {
      const matchDate = new Date(m.commence_time);

      const bookmaker = m.bookmakers?.[0];
      if (!bookmaker) continue;

      const outcomes = bookmaker.markets?.[0]?.outcomes;
      if (!outcomes) continue;

      const home = outcomes.find((o: any) => o.name === m.home_team);
      const away = outcomes.find((o: any) => o.name === m.away_team);

      if (!home || !away) continue;

      const homeOdd = home.price;
      const awayOdd = away.price;

      selected.push({
        home: m.home_team,
        away: m.away_team,
        league: m.sport_title,
        matchDate,
        prediction: homeOdd < awayOdd ? "CASA" : "FORA",
        odd: parseFloat(Math.min(homeOdd, awayOdd).toFixed(2)),
        confidence: 0.6,
        apiMatchId: m.id,
        extraMarkets: {
          btts: false,
          overCorners: 10,
          yellowCards: 4,
          redCard: false,
          offsides: 2,
        },
      });

      if (selected.length >= 3) break;
    }
  }

  return selected;
};