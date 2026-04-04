import "dotenv/config";
import { createBetSlip } from "../services/betSlipService";
import { sendBetToTelegram } from "../services/telegramService";

(async () => {
  try {
    console.log("🚀 Gerando ficha...");

    const betSlip = await createBetSlip();

    console.log("✅ Salvo no banco");

    const sent = await sendBetToTelegram(betSlip);

    if (sent) {
      console.log("📲 Enviado para Telegram");
    } else {
      console.log("❌ Falha no envio Telegram");
    }
  } catch (err) {
    console.error("❌ ERRO:", err);
  }
})();