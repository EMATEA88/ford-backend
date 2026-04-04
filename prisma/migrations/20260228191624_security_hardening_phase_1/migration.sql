-- DropForeignKey
ALTER TABLE "UserBank" DROP CONSTRAINT "UserBank_userId_fkey";

-- CreateIndex
CREATE INDEX "CryptoOrder_userId_status_idx" ON "CryptoOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "CryptoOrder_assetId_idx" ON "CryptoOrder"("assetId");

-- CreateIndex
CREATE INDEX "CryptoOrder_expiresAt_idx" ON "CryptoOrder"("expiresAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE INDEX "OtpCode_code_idx" ON "OtpCode"("code");

-- CreateIndex
CREATE INDEX "OtpCode_used_idx" ON "OtpCode"("used");

-- CreateIndex
CREATE INDEX "PaymentReference_userId_idx" ON "PaymentReference"("userId");

-- CreateIndex
CREATE INDEX "PaymentReference_status_idx" ON "PaymentReference"("status");

-- CreateIndex
CREATE INDEX "PaymentReference_expiresAt_idx" ON "PaymentReference"("expiresAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_publicId_idx" ON "User"("publicId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Withdrawal_userId_status_idx" ON "Withdrawal"("userId", "status");

-- CreateIndex
CREATE INDEX "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");

-- AddForeignKey
ALTER TABLE "UserBank" ADD CONSTRAINT "UserBank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
