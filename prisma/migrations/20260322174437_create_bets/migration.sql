-- CreateTable
CREATE TABLE "BetSlip" (
    "id" TEXT NOT NULL,
    "totalOdds" DOUBLE PRECISION NOT NULL,
    "strategy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetSlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetGame" (
    "id" TEXT NOT NULL,
    "home" TEXT NOT NULL,
    "away" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "prediction" TEXT NOT NULL,
    "odd" DOUBLE PRECISION NOT NULL,
    "result" TEXT,
    "score" TEXT,
    "apiMatchId" TEXT,
    "betSlipId" TEXT NOT NULL,

    CONSTRAINT "BetGame_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BetGame" ADD CONSTRAINT "BetGame_betSlipId_fkey" FOREIGN KEY ("betSlipId") REFERENCES "BetSlip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
