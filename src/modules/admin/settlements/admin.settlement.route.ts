import { Router } from "express"
import { authMiddleware } from "../../auth/auth.middleware"
import { adminMiddleware } from "../admin.middleware"
import { AdminSettlementController } from "./admin.settlement.controller"

const router = Router()

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  AdminSettlementController.list
)

router.get(
  "/stats",
  authMiddleware,
  adminMiddleware,
  AdminSettlementController.stats
)

router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  AdminSettlementController.details
)

router.patch(
  "/:id/pay",
  authMiddleware,
  adminMiddleware,
  AdminSettlementController.settle
)

export default router
