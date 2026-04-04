import axios from "axios";

const API_KEY = process.env.ODDS_API_KEY!;

// 🔥 formata ISO sem milissegundos (CRÍTICO)
const toISO = (date: Date) => {
  return date.toISOString().split(".")[0] + "Z";
};

export const getOddsMatches = async () => {
  const now = new Date();

  const future = new Date();
  future.setDate(now.getDate() + 2);

  const from = toISO(now);
  const to = toISO(future);

  try {
    const res = await axios.get(
      "https://api.the-odds-api.com/v4/sports/soccer/odds",
      {
        params: {
          apiKey: API_KEY,
          regions: "eu",
          markets: "h2h",
          oddsFormat: "decimal",
          dateFormat: "iso",
          commenceTimeFrom: from,
          commenceTimeTo: to, // 🔥 AGORA CORRETO
        },
        timeout: 10000,
      }
    );

    return res.data;
  } catch (error: any) {
    console.error("❌ ERRO ODDS API:");

    if (error.response) {
      console.error("STATUS:", error.response.status);
      console.error("DATA:", error.response.data);
    } else {
      console.error(error.message);
    }

    return [];
  }
};