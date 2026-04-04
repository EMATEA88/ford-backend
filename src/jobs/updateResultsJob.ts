import { updateResults } from "../services/resultService";

(async () => {
  console.log("🔄 Atualizando resultados...");

  await updateResults();

  console.log("✅ Resultados atualizados");
})();