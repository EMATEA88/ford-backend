import { prisma } from '../lib/prisma'
import { nanoid } from 'nanoid'

async function main() {
  const users = await prisma.user.findMany()

  const usersWithoutCode = users.filter(
    (u) => !u.referralCode || u.referralCode === ''
  )

  console.log(`Users sem código: ${usersWithoutCode.length}`)

  for (const user of usersWithoutCode) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        referralCode: nanoid(8)
      }
    })
  }

  console.log('OK - códigos gerados')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })