import { Router } from "express";
import { testRealBet } from "../controllers/betController";

const router = Router();

// 🔥 TESTE MANUAL (DEV)
router.get("/test", testRealBet);

// 🔥 FUTURO (produção)
// router.post("/generate", generateBet);
// router.get("/history", getBetHistory);

export default router;