-- AlterTable
ALTER TABLE "InvestmentPackage" ADD COLUMN     "percent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wallet" TEXT;
