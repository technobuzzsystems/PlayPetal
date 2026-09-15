/*
  Warnings:

  - You are about to drop the column `effectivePrice` on the `SellerOffer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX IF EXISTS "SellerOffer_masterProductId_status_effectivePrice_idx";

DO $$ 
BEGIN 
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'SellerOffer') THEN
    ALTER TABLE "SellerOffer" DROP COLUMN IF EXISTS "effectivePrice";
    CREATE INDEX IF NOT EXISTS "SellerOffer_masterProductId_status_idx" ON "SellerOffer"("masterProductId", "status");
  END IF;
END $$;
