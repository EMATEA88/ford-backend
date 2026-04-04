import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({
  keepAlive: true,
  family: 4,
});

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export const sendBetToTelegram = async (betSlip: any): Promise<boolean> => {
  try {
    let oddTotal = 1;

    const games = betSlip.games
      .map((g: any, index: number) => {
        const date = new Date(g.matchDate);

        const formattedDate = date.toLocaleDateString("pt-PT");
        const formattedTime = date.toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const predictionText =
          g.prediction === "CASA"
            ? "Vitória Casa"
            : g.prediction === "FORA"
            ? "Vitória Fora"
            : "Empate";

        oddTotal *= g.odd;

        return `🔹 <b>Jogo ${index + 1}</b>
⚽ ${g.home} vs ${g.away}
📅 ${formattedDate} ⏰ ${formattedTime}

📊 ${predictionText}
💸 Odd: <b>${g.odd}</b>

📈 <b>Extras:</b>
✔ Ambas marcam: ${g.extraMarkets?.btts ? "SIM" : "NÃO"}
✔ Cantos: +${g.extraMarkets?.overCorners ?? "-"}
✔ Amarelos: ${g.extraMarkets?.yellowCards ?? "-"}
✔ Vermelho: ${g.extraMarkets?.redCard ? "SIM" : "NÃO"}
✔ Foras de jogo: ${g.extraMarkets?.offsides ?? "-"}`;
      })
      .join("\n\n");

    const message = `🔥 <b>FICHA AUTOMÁTICA</b>

${games}

━━━━━━━━━━━━━━━
💰 <b>Odd Total:</b> ${oddTotal.toFixed(2)}
📊 <b>Estratégia:</b> AUTO_V2`;

    let res: any;

    for (let i = 0; i < 3; i++) {
      try {
        res = await axios.post(
          `https://api.telegram.org/bot${TOKEN}/sendMessage`,
          {
            chat_id: CHAT_ID,
            text: message,
            parse_mode: "HTML",
          },
          {
            timeout: 30000,
            httpsAgent,
          }
        );

        console.log("📲 Telegram enviado:", res.data.ok);
        return true;
      } catch (err) {
        console.log(`🔁 Retry ${i + 1}...`);
        if (i === 2) throw err;
      }
    }

    return false;
  } catch (error: any) {
    console.error("❌ Telegram erro:", error.message);
    return false;
  }
};