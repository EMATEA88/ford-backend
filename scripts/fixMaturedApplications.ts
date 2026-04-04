import { prisma } from "../src/lib/prisma"
import { Prisma, ApplicationStatus } from "@prisma/client"

async function fixMaturedApplications() {

  const now = new Date()

  console.log("🔧 Fixing matured applications...")

  const apps = await prisma.application.findMany({
    where: {
      status: ApplicationStatus.ACTIVE
    }
  })

  console.log("Total ACTIVE:", apps.length)

  let fixed = 0

  for (const app of apps) {

    // ⚠️ FORÇAR processamento (ignorar data)

    await prisma.$transaction(async (tx) => {

      const fresh = await tx.application.findUnique({
        where: { id: app.id }
      })

      if (!fresh || fresh.status !== ApplicationStatus.ACTIVE) return

      const amount = new Prisma.Decimal(fresh.amount)
      const totalReturn = new Prisma.Decimal(fresh.totalReturn)

      // 💰 devolve saldo
      await tx.user.update({
        where: { id: fresh.userId },
        data: {
          frozenBalance: { decrement: amount },
          balance: { increment: totalReturn }
        }
      })

      // 🧾 marca como processado
      await tx.application.update({
        where: { id: fresh.id },
        data: {
          status: ApplicationStatus.MATURED,
          redeemedAt: new Date()
        }
      })

      console.log(`✅ Fixed application ID: ${fresh.id}`)
      fixed++

    })

  }

  console.log(`🎯 Total fixed: ${fixed}`)
}

fixMaturedApplications()
  .then(() => {
    console.log("🚀 DONE")
    process.exit(0)
  })
  .catch((err) => {
    console.error("❌ ERROR:", err)
    process.exit(1)
  })