/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inviterId,invitedId,level]` on the table `Referral` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Referral_invitedId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_key" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_inviterId_invitedId_level_key" ON "Referral"("inviterId", "invitedId", "level");
