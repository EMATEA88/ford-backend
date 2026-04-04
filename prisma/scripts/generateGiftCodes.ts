import { prisma } from '../../src/lib/prisma'
import crypto from 'crypto'

async function main() {
  const QUANTITY = 10
  const VALUE = 50000
  const DAYS_VALID = 30

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + DAYS_VALID)

  const codes = Array.from({ length: QUANTITY }).map(() => ({
    code: crypto.randomBytes(6).toString('hex').toUpperCase(),
    value: VALUE,
    expiresAt,
  }))

  await prisma.giftCode.createMany({
    data: codes,
  })

  console.log('🎁 Códigos gerados:')
  codes.forEach(c =>
    console.log(`${c.code} → ${VALUE} Kz`)
  )
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
