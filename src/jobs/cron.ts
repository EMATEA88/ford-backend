import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { createBetSlip } from "../services/betSlipService";
import { sendBetToTelegram } from "../services/telegramService";

export const startCronJobs = () => {
  console.log("🟢 Cron iniciado...");

  setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {}
}, 30000);

  // ⏱️ A cada 1 horas
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("🚀 Gerando ficha automática...");

      const betSlip = await createBetSlip();

      await sendBetToTelegram(betSlip);

      console.log("✅ Ficha enviada com sucesso");
    } catch (err) {
      console.error("❌ Erro no cron:", err);
    }
  });
};