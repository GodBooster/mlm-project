/*
  Warnings:

  - Made the column `maxAmount` on table `InvestmentPackage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "InvestmentPackage" ALTER COLUMN "maxAmount" SET NOT NULL;
