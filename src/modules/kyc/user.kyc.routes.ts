import { Router } from "express"
import { authMiddleware } from "../../modules/auth/auth.middleware"
import { UserKYCController } from "./user.kyc.controller"
import { upload } from "../../config/upload"

const router = Router()

router.use(authMiddleware)

router.post(
  "/submit",
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
    { name: "selfieImage", maxCount: 1 }
  ]),
  UserKYCController.submit
)

router.get("/status", UserKYCController.status)

export const userKYCRoutes = router
