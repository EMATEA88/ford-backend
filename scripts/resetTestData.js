"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/lib/prisma");
async function main() {
    console.log("⚠️ Iniciando limpeza de dados de teste...");
    await prisma_1.prisma.$transaction(async (tx) => {
        // 1️⃣ apagar transações
        await tx.transaction.deleteMany({});
        // 2️⃣ apagar depósitos
        await tx.recharge.deleteMany({});
        // 3️⃣ apagar levantamentos
        await tx.withdrawal.deleteMany({});
        // 4️⃣ zerar saldo dos usuários
        await tx.user.updateMany({
            data: {
                balance: 0
            }
        });
    });
    console.log("✅ Dados de teste removidos com sucesso");
}
main()
    .catch((e) => {
    console.error("❌ Erro ao limpar dados:", e);
})
    .finally(async () => {
    await prisma_1.prisma.$disconnect();
});
