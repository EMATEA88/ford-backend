import { generateRealPredictions } from "../services/predictionService";

(async () => {
  const data = await generateRealPredictions();

  console.log("PREDICTIONS:");
  console.log(data);
})();