import {
  PrismaClient,
  UserRole,
  Prisma
} from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

/* ================= GERADORES ================= */

function generatePublicId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString()
}

function generateReferralCode(): string {
  const numbers1 = Math.floor(10000 + Math.random() * 90000)
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const numbers2 = Math.floor(100 + Math.random() * 900)

  return `${numbers1}${letter}${numbers2}`
}

/* ================= SEED ================= */

async function main() {
  console.log('🌱 Seed corrigido iniciado...')

  // 1. Limpeza rápida para evitar conflitos de Unique Constraints no teste
  await prisma.referralTree.deleteMany({});
  await prisma.referral.deleteMany({});

  const adminPassword = await bcrypt.hash("Auffbal115", 10)
  const adminReferralCode = generateReferralCode()

  /* ================= ADMIN ================= */
  const admin = await prisma.user.upsert({
    where: { phone: "+244941971541" },
    update: {},
    create: {
      phone: "+244941971541",
      password: adminPassword,
      role: UserRole.ADMIN,
      balance: new Prisma.Decimal(0),
      frozenBalance: new Prisma.Decimal(0),
      publicId: generatePublicId(),
      referralCode: adminReferralCode,
    },
  })

  // ✅ Inicializa a Tree do Admin
  await prisma.referralTree.create({
    data: { userId: admin.id, level1Ids: [], level2Ids: [], level3Ids: [] }
  })

  /* ================= USER TESTE ================= */
  const userPassword = await bcrypt.hash("123456", 10)
  const userReferralCode = generateReferralCode()

  const userTeste = await prisma.user.upsert({
    where: { phone: "+244900000002" },
    update: {},
    create: {
      phone: "+244900000002",
      password: userPassword,
      role: UserRole.USER,
      balance: new Prisma.Decimal(10000),
      frozenBalance: new Prisma.Decimal(0),
      publicId: generatePublicId(),
      referralCode: userReferralCode,
      referredByCode: adminReferralCode
    },
  })

  // ✅ Inicializa a Tree do User Teste
  await prisma.referralTree.create({
    data: { userId: userTeste.id, level1Ids: [], level2Ids: [], level3Ids: [] }
  })

  // ✅ Cria o vínculo de Nível 1 entre Admin e User Teste
  await prisma.referral.create({
    data: { inviterId: admin.id, invitedId: userTeste.id, level: 1 }
  })

  // ✅ Atualiza a lista do Admin para incluir o User Teste no Nível 1
  await prisma.referralTree.update({
    where: { userId: admin.id },
    data: { level1Ids: { push: userTeste.id } }
  })

  console.log("✅ Estrutura de rede inicializada no seed")

  /* ================= PRODUTOS ================= */
  const products = [
    { name: 'Ford Mustang GT', price: 15000, dailyRate: 7, durationDays: 30 },
    { name: 'Ford Fiesta', price: 6000, dailyRate: 10, durationDays: 60 },
    { name: 'Ford F-150', price: 50000, dailyRate: 6, durationDays: 25 },
    { name: 'Ford Explorer', price: 150000, dailyRate: 6, durationDays: 25 },
    { name: 'Ford GT', price: 500000, dailyRate: 6, durationDays: 25 }
  ]

  for (const product of products) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: {},
      create: {
        name: product.name,
        price: new Prisma.Decimal(product.price),
        dailyRate: new Prisma.Decimal(product.dailyRate),
        durationDays: product.durationDays,
        isActive: true
      }
    })
  }

  console.log('🚀 Seed concluído com sucesso. Use o código:', userReferralCode, "para novos cadastros.");
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })