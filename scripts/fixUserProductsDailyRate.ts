import { prisma } from '../src/lib/prisma'
import { Prisma } from '@prisma/client'

async function main() {

  console.log('🚀 Iniciando migração de dailyRate...')

  const userProducts = await prisma.userProduct.findMany({
    include: {
      product: true
    }
  })

  let updated = 0
  let skipped = 0

  for (const up of userProducts) {

    const amount = Number(up.amount)
    const productRate = Number(up.product.dailyRate)

    const correctDaily = amount * (productRate / 100)

    const currentDaily = Number(up.dailyRate)

    // 🔒 evita recalcular duas vezes
    if (currentDaily > 100) {
      skipped++
      continue
    }

    await prisma.userProduct.update({
      where: { id: up.id },
      data: {
        dailyRate: new Prisma.Decimal(correctDaily)
      }
    })

    console.log(`✔ Corrigido ID ${up.id}: ${currentDaily} → ${correctDaily}`)

    updated++
  }

  console.log('\n📊 RESULTADO:')
  console.log(`✔ Atualizados: ${updated}`)
  console.log(`⏭ Ignorados: ${skipped}`)
  console.log('✅ Migração concluída com sucesso')
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })