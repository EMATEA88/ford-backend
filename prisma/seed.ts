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

async function generateUniqueReferralCode(): Promise<string> {
while (true) {
const code = generateReferralCode()

const exists = await prisma.user.findUnique({
  where: { referralCode: code }
})

if (!exists) return code

}
}

/* ================= SEED ================= */

async function main() {

console.log('🌱 Seed LIMPO iniciado...')

/* ================= ADMIN ================= */

const adminPassword = await bcrypt.hash("Auffbal115", 10)
const adminReferral = await generateUniqueReferralCode()

await prisma.user.upsert({
where: { phone: "+244941971541" },
update: {},
create: {
phone: "+244941971541",
password: adminPassword,
role: UserRole.ADMIN,
balance: new Prisma.Decimal(0),
frozenBalance: new Prisma.Decimal(0),
publicId: generatePublicId(),
referralCode: adminReferral,
},
})

/* ================= USER TESTE ================= */

const userPassword = await bcrypt.hash("123456", 10)
const userReferral = await generateUniqueReferralCode()

await prisma.user.upsert({
where: { phone: "+244900000002" },
update: {},
create: {
phone: "+244900000002",
password: userPassword,
role: UserRole.USER,
balance: new Prisma.Decimal(10000),
frozenBalance: new Prisma.Decimal(0),
publicId: generatePublicId(),
referralCode: userReferral,
referredByCode: adminReferral
},
})

console.log("✅ User teste criado")
console.log("📌 Referral user:", userReferral)

/* ================= PRODUTOS ================= */

const products = [
{ name: 'Ford Mustang GT', price: 15000, dailyRate: 7, durationDays: 30 },
{ name: 'Ford Fiesta', price: 6000, dailyRate: 10, durationDays: 60 },
{ name: 'Ford F-150', price: 50000, dailyRate: 6, durationDays: 25 },
{ name: 'Ford Explorer', price: 150000, dailyRate: 6, durationDays: 25 },
{ name: 'Ford GT', price: 500000, dailyRate: 6, durationDays: 25 }
]

for (const product of products) {
const exists = await prisma.product.findFirst({
where: { name: product.name }
})

if (!exists) {
  await prisma.product.create({
    data: {
      name: product.name,
      price: new Prisma.Decimal(product.price),
      dailyRate: new Prisma.Decimal(product.dailyRate),
      durationDays: product.durationDays,
      isActive: true
    }
  })
}

}

console.log("✅ Produtos criados")
console.log('🚀 Seed concluído com sucesso')
}

main()
.catch((e) => {
console.error('❌ Erro no seed:', e)
process.exit(1)
})
.finally(async () => {
await prisma.$disconnect()
})