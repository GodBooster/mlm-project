-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('FARMING', 'UNSTAKED');

-- CreateTable
CREATE TABLE "defi_positions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "poolId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "entryApy" DOUBLE PRECISION NOT NULL,
    "currentApy" DOUBLE PRECISION NOT NULL,
    "entryTvl" DOUBLE PRECISION NOT NULL,
    "currentTvl" DOUBLE PRECISION NOT NULL,
    "status" "PositionStatus" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "exitReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defi_positions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "defi_positions" ADD CONSTRAINT "defi_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
