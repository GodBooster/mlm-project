-- AlterTable
ALTER TABLE "User" ADD COLUMN     "depositAddress" TEXT;

-- AlterTable
ALTER TABLE "defi_positions" ADD COLUMN     "exitApy" DOUBLE PRECISION,
ADD COLUMN     "exitTvl" DOUBLE PRECISION;
