import { prisma } from '../../src/lib/prisma'

function generatePublicId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString()
}

async function main() {
  const usersWithoutPublicId = await prisma.user.findMany({
    where: {
      publicId: null,
    },
    select: {
      id: true,
    },
  })

  console.log(
    `🔎 Encontrados ${usersWithoutPublicId.length} utilizadores sem publicId`
  )

  for (const user of usersWithoutPublicId) {
    let publicId = ''
    let exists = true

    while (exists) {
      publicId = generatePublicId()

      const check = await prisma.user.findUnique({
        where: { publicId },
      })

      exists = !!check
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { publicId },
    })

    console.log(`✅ User ${user.id} → publicId ${publicId}`)
  }

  console.log('🎉 Processo concluído com sucesso')
}

main()
  .catch(err => {
    console.error('❌ Erro ao preencher publicId:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
