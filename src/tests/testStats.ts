import "dotenv/config";
import { getStats } from "../services/statsService";

(async () => {
  const stats = await getStats();

  console.log("📊 ESTATÍSTICAS:");
  console.log(stats);
})();