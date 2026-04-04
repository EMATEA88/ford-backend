/*
  Warnings:

  - You are about to alter the column `buyPrice` on the `Asset` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `sellPrice` on the `Asset` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `oldBuy` on the `AssetPriceHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `newBuy` on the `AssetPriceHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `oldSell` on the `AssetPriceHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `newSell` on the `AssetPriceHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.

*/
-- AlterTable
ALTER TABLE "Asset" ALTER COLUMN "buyPrice" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "sellPrice" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "AssetPriceHistory" ALTER COLUMN "oldBuy" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "newBuy" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "oldSell" SET DATA TYPE DECIMAL(18,8),
ALTER COLUMN "newSell" SET DATA TYPE DECIMAL(18,8);
