import cron from "node-cron";
import { createBetSlip } from "../services/betSlipService";
import { sendBetToTelegram } from "../services/telegramService";

export const startBetGenerator = () => {
  cron.schedule("0 */2 * * *", async () => {
    try {
      console.log("⏱ Gerando ficha automática...");

      const betSlip = await createBetSlip();
      await sendBetToTelegram(betSlip);

      console.log("✅ Ficha enviada automaticamente");
    } catch (err) {
      console.error("❌ Erro no cron:", err);
    }
  });
};