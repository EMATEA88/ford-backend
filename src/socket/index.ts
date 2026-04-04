import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma"
import { OrderStatus } from "@prisma/client"

const MAX_MESSAGE_LENGTH = 1000
const MESSAGE_RATE_LIMIT = 5 // msgs por 3 segundos

export function initSocket(server: any) {

  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://ematea.netlify.app",
      ],
      credentials: true,
    },
  })

  /* ================= JWT AUTH ================= */
  io.use(async (socket, next) => {
    try {

      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "")

      if (!token) return next(new Error("TOKEN_MISSING"))

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as { id: number }

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, isBlocked: true }
      })

      if (!user) return next(new Error("USER_NOT_FOUND"))
      if (user.isBlocked) return next(new Error("USER_BLOCKED"))

      socket.data.userId = user.id
      socket.data.msgCount = 0
      socket.data.lastReset = Date.now()

      next()

    } catch {
      return next(new Error("INVALID_TOKEN"))
    }
  })

  /* ================= CONNECTION ================= */
  io.on("connection", async (socket) => {

    const userId = socket.data.userId

    socket.join(`user:${userId}`)

    await prisma.userPresence.upsert({
      where: { userId },
      update: { isOnline: true, lastSeen: new Date() },
      create: { userId, isOnline: true, lastSeen: new Date() },
    })

    io.emit("presence:update", { userId, isOnline: true })

    /* ================= OTC JOIN ================= */
    socket.on("otc:join", async (orderId: number) => {

      if (!orderId) return

      const order = await prisma.cryptoOrder.findUnique({
        where: { id: orderId },
        select: { userId: true }
      })

      if (!order) return
      if (order.userId !== userId) return

      socket.join(`otc:${orderId}`)
    })

    /* ================= OTC MESSAGE ================= */
    socket.on("otc:message", async ({ orderId, message }) => {

      if (!orderId || !message) return
      if (message.length > MAX_MESSAGE_LENGTH) return

      // Rate limit simples
      const now = Date.now()
      if (now - socket.data.lastReset > 3000) {
        socket.data.msgCount = 0
        socket.data.lastReset = now
      }

      socket.data.msgCount++

      if (socket.data.msgCount > MESSAGE_RATE_LIMIT) return

      const order = await prisma.cryptoOrder.findUnique({
        where: { id: orderId },
        include: { conversation: true }
      })

      if (!order) return
      if (order.userId !== userId) return

      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.RELEASED ||
        order.status === OrderStatus.EXPIRED
      ) {
        return
      }

      if (!order.conversation) return

      const newMessage = await prisma.supportMessage.create({
        data: {
          conversationId: order.conversation.id,
          senderId: userId,
          isAdmin: false,
          content: message.slice(0, MAX_MESSAGE_LENGTH)
        }
      })

      await prisma.supportConversation.update({
        where: { id: order.conversation.id },
        data: {
          lastMessage: message.slice(0, 120),
          unreadAdmin: { increment: 1 }
        }
      })

      io.to(`otc:${orderId}`).emit("otc:new-message", newMessage)
    })

    /* ================= TYPING ================= */
    socket.on("otc:typing", (orderId: number) => {
      socket.to(`otc:${orderId}`).emit("otc:typing", { userId })
    })

    socket.on("otc:stop-typing", (orderId: number) => {
      socket.to(`otc:${orderId}`).emit("otc:stop-typing", { userId })
    })

    /* ================= DISCONNECT ================= */
    socket.on("disconnect", async () => {

      await prisma.userPresence.update({
        where: { userId },
        data: {
          isOnline: false,
          lastSeen: new Date(),
        },
      })

      io.emit("presence:update", {
        userId,
        isOnline: false
      })
    })

  })

  return io
}