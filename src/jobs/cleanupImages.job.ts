import cron from "node-cron"
import { prisma } from "../lib/prisma"
import cloudinary from "../config/cloudinary"

export function startImageCleanupJob() {

  // Roda todo dia às 03:00
  cron.schedule("0 3 * * *", async () => {

    console.log("🧹 Iniciando limpeza de imagens antigas...")

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const oldImages = await prisma.supportMessage.findMany({
      where: {
        type: "IMAGE",
        createdAt: {
          lt: thirtyDaysAgo
        },
        imagePublicId: {
          not: null
        }
      }
    })

    console.log(`Encontradas ${oldImages.length} imagens antigas`)

    for (const msg of oldImages) {
      try {

        if (msg.imagePublicId) {
          await cloudinary.uploader.destroy(msg.imagePublicId)
        }

        await prisma.supportMessage.update({
          where: { id: msg.id },
          data: {
            imageUrl: null,
            imagePublicId: null,
            content: "[Imagem removida automaticamente]"
          }
        })

      } catch (err) {
        console.error("Erro ao remover imagem:", msg.id, err)
      }
    }

    console.log("✅ Limpeza concluída.")

  })
}