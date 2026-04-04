import { prisma } from '../lib/prisma'

async function resetSystemFinancial() {
  console.log('🔥 Reset financeiro total iniciado...')

  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.withdrawal.deleteMany(),
    prisma.recharge.deleteMany(),
    prisma.commission.deleteMany(),
    prisma.taskEarning.deleteMany(),
    prisma.userProduct.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.user.updateMany({
      data: {
        balance: 0,
        isBlocked: false,
      },
    }),
  ])

  console.log('✅ Sistema completamente zerado (users mantidos)')
}

resetSystemFinancial()
  .catch((err) => {
    console.error('❌ ERRO:', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })