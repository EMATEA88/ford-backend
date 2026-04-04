// scripts/fixPublicIds.ts
import { prisma } from '../src/lib/prisma'

function generatePublicId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString()
}

async function run() {
  const users = await prisma.user.findMany({
    where: { publicId: null },
  })

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { publicId: generatePublicId() },
    })
  }

  console.log('Public IDs gerados com sucesso')
}

run()
