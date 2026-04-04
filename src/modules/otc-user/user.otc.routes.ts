import { Router } from "express"
import { authMiddleware } from "../../modules/auth/auth.middleware"
import { UserOTCController } from "./user.otc.controller"
import { upload } from "../../config/upload"

const router = Router()

/* ================= ASSETS (PÚBLICO) ================= */
router.get("/assets", UserOTCController.assets)

/* ================= ORDERS (PROTEGIDO) ================= */
router.post("/orders", authMiddleware, UserOTCController.create)
router.get("/orders/:id", authMiddleware, UserOTCController.getOne)
router.get("/my-orders", authMiddleware, UserOTCController.myOrders)

/* ================= ACTIONS (PROTEGIDO) ================= */
router.patch("/orders/:id/pay", authMiddleware, UserOTCController.markAsPaid)
router.patch("/orders/:id/dispute", authMiddleware, UserOTCController.dispute)
router.patch("/orders/:id/cancel", authMiddleware, UserOTCController.cancel)

/* ================= CHAT UPLOAD IMAGE ================= */
router.post(
  "/chat/:orderId/image",
  authMiddleware,
  upload.single("image"),
  UserOTCController.uploadImage
)

export const userOTCRoutes = router