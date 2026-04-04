"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/fixPublicIds.ts
const prisma_1 = require("../src/lib/prisma");
function generatePublicId() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}
async function run() {
    const users = await prisma_1.prisma.user.findMany({
        where: { publicId: null },
    });
    for (const user of users) {
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { publicId: generatePublicId() },
        });
    }
    console.log('Public IDs gerados com sucesso');
}
run();
