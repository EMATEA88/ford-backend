-- CreateTable
CREATE TABLE "KixikilaGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contribution" DECIMAL(18,2) NOT NULL,
    "membersLimit" INTEGER NOT NULL,
    "cycleMonths" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KixikilaGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KixikilaRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KixikilaRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KixikilaMember" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "contribution" DECIMAL(18,2) NOT NULL,
    "frozenAmount" DECIMAL(18,2) NOT NULL,
    "totalReceived" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalToReceive" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KixikilaMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KixikilaPayment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "penalty" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KixikilaPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KixikilaRequest_userId_groupId_key" ON "KixikilaRequest"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "KixikilaMember_userId_groupId_key" ON "KixikilaMember"("userId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "KixikilaPayment_memberId_round_key" ON "KixikilaPayment"("memberId", "round");

-- AddForeignKey
ALTER TABLE "KixikilaRequest" ADD CONSTRAINT "KixikilaRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KixikilaRequest" ADD CONSTRAINT "KixikilaRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "KixikilaGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KixikilaMember" ADD CONSTRAINT "KixikilaMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KixikilaMember" ADD CONSTRAINT "KixikilaMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "KixikilaGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KixikilaPayment" ADD CONSTRAINT "KixikilaPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KixikilaPayment" ADD CONSTRAINT "KixikilaPayment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "KixikilaGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KixikilaPayment" ADD CONSTRAINT "KixikilaPayment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "KixikilaMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
