/*
  Warnings:

  - You are about to drop the column `effectivePrice` on the `SellerOffer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SellerOffer_masterProductId_status_effectivePrice_idx";

-- AlterTable
ALTER TABLE "SellerOffer" DROP COLUMN "effectivePrice";

-- CreateIndex
CREATE INDEX "SellerOffer_masterProductId_status_idx" ON "SellerOffer"("masterProductId", "status");
