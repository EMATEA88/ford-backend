import axios from "axios";

const API_KEY = process.env.FOOTBALL_API_KEY!;
const HOST = process.env.FOOTBALL_API_HOST!;

export const getTeamStats = async (teamId: number, leagueId: number) => {
  try {
    const res = await axios.get(
      "https://api-football-v1.p.rapidapi.com/v3/teams/statistics",
      {
        params: {
          team: teamId,
          league: leagueId,
          season: 2024,
        },
        headers: {
          "X-RapidAPI-Key": API_KEY,
          "X-RapidAPI-Host": HOST,
        },
      }
    );

    return res.data.response;
  } catch (err) {
    console.error("Erro ao buscar stats:", err);
    return null;
  }
};