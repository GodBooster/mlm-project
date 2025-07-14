/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `InvestmentPackage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPackage_name_key" ON "InvestmentPackage"("name");
