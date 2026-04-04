import { prisma } from "../lib/prisma"
import { Server, Socket } from "socket.io"

export function registerPresenceEvents(
  io: Server,
  socket: Socket,
  userId: number // 🔥 AGORA É NUMBER
) {

  socket.on("disconnect", async () => {

    await prisma.user.update({
      where: { id: userId }, // 🔥 agora bate com o tipo Int
      data: {
        isOnline: false,
        lastSeen: new Date()
      }
    })

    io.emit("user:offline", userId)
  })
}