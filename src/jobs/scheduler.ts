import cron from "node-cron"
import { applicationMaturityJob } from "./application.maturity.job"

export function startJobs() {

  // Executa a cada 1 minuto (produção pode mudar para 5 ou 10)
  cron.schedule("* * * * *", async () => {
    await applicationMaturityJob()
  })

  console.log("🕒 Jobs scheduler iniciado")
}
