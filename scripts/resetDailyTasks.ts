import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('🧹 Resetando tarefas de hoje...')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = await prisma.dailyTask.deleteMany({
    where: {
      date: {
        gte: today
      }
    }
  })

  console.log(`✅ ${result.count} tarefas removidas.`)
}

main()
  .catch((e) => {
    console.error('❌ Erro ao resetar tarefas:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })