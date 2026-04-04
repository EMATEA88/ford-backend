/*
  Warnings:

  - You are about to alter the column `quantity` on the `CryptoOrder` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `priceUsed` on the `CryptoOrder` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `totalAoa` on the `CryptoOrder` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,2)`.

*/
-- AlterTable
ALTER TABLE "CryptoOrder" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "priceUsed" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "totalAoa" SET DATA TYPE DECIMAL(18,2);
