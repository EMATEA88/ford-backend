import { Router } from "express"
import { authMiddleware } from "../../../modules/auth/auth.middleware"
import { adminMiddleware } from "../../../modules/admin/admin.middleware"
import { AdminKYCController } from "./admin.kyc.controller"

const router = Router()

router.use(authMiddleware, adminMiddleware)

router.get("/", AdminKYCController.list)
router.patch("/:userId/approve", AdminKYCController.approve)
router.patch("/:userId/reject", AdminKYCController.reject)

export const adminKYCRoutes = router
