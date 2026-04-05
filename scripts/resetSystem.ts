import { prisma } from '../src/lib/prisma'
import { Prisma } from '@prisma/client'

async function main() {

  console.log('🚨 RESET TOTAL INICIADO...\n')

  /* =========================
     1. LIMPAR INVESTIMENTOS
  ========================= */
  console.log('🧹 Limpando UserProducts...')
  await prisma.userProduct.deleteMany()

  /* =========================
     2. LIMPAR TAREFAS
  ========================= */
  console.log('🧹 Limpando tarefas...')
  await prisma.dailyTask.deleteMany().catch(() => {})

  /* =========================
     3. LIMPAR COMISSÕES / LEDGER
  ========================= */
  console.log('🧹 Limpando ledger (comissões, bônus)...')
  await prisma.ledgerEntry.deleteMany()

  /* =========================
     4. LIMPAR TRANSAÇÕES (OPCIONAL)
  ========================= */
  console.log('🧹 Limpando transações...')
  await prisma.transaction.deleteMany().catch(() => {})

  /* =========================
     5. RESET SALDO USUÁRIOS
  ========================= */
  console.log('🧹 Resetando saldo dos usuários...')

  await prisma.user.updateMany({
    data: {
      balance: new Prisma.Decimal(0)
    }
  })

  /* =========================
     6. LIMPAR REFERÊNCIAS (OPCIONAL)
  ========================= */
  console.log('🧹 Limpando referrals...')
  await prisma.referral.deleteMany()

  /* =========================
     7. LIMPAR CACHE TREE (SE EXISTIR)
  ========================= */
  console.log('🧹 Limpando referralTree...')
  await prisma.referralTree.deleteMany().catch(() => {})

  console.log('\n✅ RESET COMPLETO FINALIZADO')
}

main()
  .catch(e => {
    console.error('❌ ERRO NO RESET:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })