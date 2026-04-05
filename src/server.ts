import app from './main'
import dotenv from 'dotenv'
import cors from 'cors'
import cron from 'node-cron'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import { createServer } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from './lib/prisma'
import { runOtcExpirationJob } from './jobs/otc-expiration.job'
import { startJobs } from './jobs/scheduler'
import { startImageCleanupJob } from "./jobs/cleanupImages.job"
import { OrderStatus } from '@prisma/client'
import { emailQueue } from './services/email.queue'
import { startKixikilaJob } from "./jobs/kixikilaJob"
import { applicationMaturityJob } from "./jobs/application.maturity.job"
import { startCronJobs } from "./jobs/cron";
import { startBetGenerator } from "./jobs/betGenerator.job";
dotenv.config()

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET not defined")
}

const PORT = Number(process.env.PORT) || 3333

/* ================= SECURITY LAYER ================= */

app.set('trust proxy', 1)

/* ---------- Helmet (único, configurado corretamente) ---------- */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
  })
)

/* ---------- Compression ---------- */
app.use(compression())

/* ---------- Rate limit global (leve) ---------- */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

/* ================= CORS HARDENED ================= */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ford-admin.onrender.com',
  'https://ford-8e7y.onrender.com',
  'https://ematea.org',
  'https://www.ematea.org',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost'
]

app.use(
  cors({
    origin: function (origin, callback) {

      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error("Not allowed by CORS"))
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-app"] // 🔥 AQUI
  })
)

/* ================= HTTP SERVER ================= */

const httpServer = createServer(app)

/* ================= SOCKET.IO ================= */

export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  },
  transports: ['websocket'],
  pingTimeout: 20000,
  pingInterval: 25000,
})

/* ================= SOCKET AUTH ================= */

io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '')

    if (!token) return next(new Error('TOKEN_MISSING'))

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      { algorithms: ['HS256'] }
    ) as { id: number; role: string }

    if (!decoded?.id || typeof decoded.id !== 'number') {
      return next(new Error('INVALID_TOKEN'))
    }

    socket.data.userId = decoded.id
    socket.data.role = decoded.role

    next()
  } catch {
    return next(new Error('INVALID_TOKEN'))
  }
})

/* ================= SOCKET EVENTS ================= */

io.on('connection', async (socket) => {

  const userId = Number(socket.data.userId)
  const role = socket.data.role

  if (!userId || isNaN(userId)) {
    return socket.disconnect()
  }

  socket.join(`user:${userId}`)

  if (role === 'ADMIN') {
    socket.join('admin:global')
  }

  /* ---------- PRESENCE ---------- */

  await prisma.userPresence.upsert({
    where: { userId },
    update: { isOnline: true, lastSeen: new Date() },
    create: { userId, isOnline: true, lastSeen: new Date() },
  })

  io.emit('presence:update', { userId, isOnline: true })

  /* ---------- MESSAGE FLOOD PROTECTION ---------- */

  let lastMessageTimestamp = 0

  socket.on('otc:message', async ({ orderId, message }) => {

    const now = Date.now()
    if (now - lastMessageTimestamp < 800) return
    lastMessageTimestamp = now

    if (!orderId || typeof message !== 'string') return
    if (message.length > 1000) return

    const sanitizedMessage = message.trim()

    const order = await prisma.cryptoOrder.findUnique({
      where: { id: Number(orderId) },
      include: { conversation: true },
    })

    if (!order || !order.conversation) return
    if (role !== 'ADMIN' && order.userId !== userId) return

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RELEASED ||
      order.status === OrderStatus.EXPIRED
    ) {
      return
    }

    const newMessage = await prisma.supportMessage.create({
      data: {
        conversationId: order.conversation.id,
        senderId: userId,
        isAdmin: role === 'ADMIN',
        type: 'TEXT',
        content: sanitizedMessage,
      },
    })

    let recipientId: number

    if (role === 'ADMIN') {
      recipientId = order.userId
    } else {
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      })
      if (!admin) return
      recipientId = admin.id
    }

    await prisma.notification.create({
      data: {
        userId: recipientId,
        title: "Nova mensagem",
        message: "Você recebeu uma nova mensagem na negociação.",
        type: "INFO"
      }
    })

    const payload = {
      title: "Nova mensagem",
      message: "Você recebeu uma nova mensagem na negociação.",
      orderId
    }

    io.to(`user:${recipientId}`).emit('notification:new', payload)

    const recipientPresence = await prisma.userPresence.findUnique({
      where: { userId: recipientId },
    })

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true },
    })

    const isOffline = !recipientPresence?.isOnline

    if (isOffline && recipient?.email) {

      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

      if (!recipientPresence?.lastSeen || recipientPresence.lastSeen < twoMinutesAgo) {

        emailQueue.add({
          userId: recipientId,
          to: recipient.email,
          subject: "Nova mensagem na EMATEA",
          title: "Você recebeu uma nova mensagem",
          content: `
            <p>Há uma nova mensagem na sua negociação.</p>
            <p>Entre na plataforma para visualizar.</p>
          `,
          buttonText: "Abrir Plataforma",
          buttonUrl: "https://ematea.org/dashboard"
        })
      }
    }

    io.to(`otc:${orderId}`).emit('otc:new-message', newMessage)
  })

  socket.on('disconnect', async () => {

    await prisma.userPresence.upsert({
      where: { userId },
      update: { isOnline: false, lastSeen: new Date() },
      create: { userId, isOnline: false, lastSeen: new Date() },
    })

    io.emit('presence:update', { userId, isOnline: false })
  })
})

/* ================= CRON ================= */

cron.schedule('0 */2 * * *', async () => {
  try {
    console.log("📊 Running job...")

    await applicationMaturityJob()

  } catch (error) {
    console.error("❌ Error:", error)
  }
})

/* ================= GLOBAL ERROR HANDLER ================= */

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED_REJECTION:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT_EXCEPTION:', error)
})

/* ================= START SERVER ================= */

httpServer.listen(PORT, '0.0.0.0', () => {
  startJobs()
  startImageCleanupJob()
  startKixikilaJob()
  startBetGenerator();
  startCronJobs();
})