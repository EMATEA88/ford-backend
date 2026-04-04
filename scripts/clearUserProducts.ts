import { prisma } from '../src/lib/prisma'

async function main() {

  console.log('🧹 Limpando produtos comprados...')

  const result = await prisma.userProduct.deleteMany({})

  console.log(`✅ ${result.count} produtos removidos com sucesso`)

}

main()
  .catch((e) => {
    console.error('❌ Erro ao limpar produtos:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })