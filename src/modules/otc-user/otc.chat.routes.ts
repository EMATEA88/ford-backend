import { Router } from "express"
import { authMiddleware } from "../../modules/auth/auth.middleware"
import { OTCChatController } from "./otc.chat.controller"

const router = Router()

router.get(
  "/:orderId",
  authMiddleware,
  OTCChatController.get
)

router.post(
  "/:orderId",
  authMiddleware,
  OTCChatController.send
)

export const otcChatRoutes = router