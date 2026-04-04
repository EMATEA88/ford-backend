import { Router } from "express"

import { authMiddleware } from "../../../modules/auth/auth.middleware"

import {
  createGroup,
  listGroups,
  approveMember,
  payMember
} from "../controllers/adminKixikilaController"

import {
  getKixikilaDashboard,
  joinGroup,
  getGroupMembers
} from "../controllers/userKixikilaController"

import { listRequests } from "../controllers/adminKixikilaController"

import { updateGroup, deleteGroup } from "../controllers/adminKixikilaController"

const router = Router()

/* =========================
   USER
========================= */

router.get("/dashboard", authMiddleware, getKixikilaDashboard)

router.post("/join", authMiddleware, joinGroup)

/* VER MEMBROS DO GRUPO */

router.get(
  "/group/:id/members",
  authMiddleware,
  getGroupMembers
)

/* =========================
   ADMIN
========================= */

router.post("/admin/group", authMiddleware, createGroup)

router.get("/admin/groups", authMiddleware, listGroups)

router.post("/admin/approve", authMiddleware, approveMember)

router.post("/admin/pay", authMiddleware, payMember)

router.get("/admin/requests", authMiddleware, listRequests)

router.put("/admin/group/:id", authMiddleware, updateGroup)

router.delete("/admin/group/:id", authMiddleware, deleteGroup)

export default router