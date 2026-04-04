import { Router } from "express"
import { authMiddleware } from "../../auth/auth.middleware"
import { adminMiddleware } from "../admin.middleware"
import { AdminOTCController } from "./admin.otc.controller"
import { upload } from "../../../config/upload"

const router = Router()

router.use(authMiddleware, adminMiddleware)

/* ================= ORDERS ================= */
router.get("/orders", AdminOTCController.list)
router.get("/orders/:id", AdminOTCController.getOne)
router.patch("/orders/:id/cancel", AdminOTCController.cancel)
router.patch("/orders/:id/release", AdminOTCController.release)

/* ================= CHAT ================= */
router.post("/chat/:orderId", AdminOTCController.sendMessage)
router.post(
  "/chat/:orderId/image",
  upload.single("image"),
  AdminOTCController.uploadImage
)

/* ================= STATS ================= */
router.get("/stats", AdminOTCController.stats)
router.get("/financial-summary", AdminOTCController.financialSummary)

/* ================= ASSETS ================= */
router.get("/assets", AdminOTCController.assets)
router.patch("/assets/:id", AdminOTCController.updateAsset)

/* ================= PRICE HISTORY ================= */
router.get("/price-history", AdminOTCController.priceHistory)

/* ================= AUDIT ================= */
router.get("/audit", AdminOTCController.audit)

export default router