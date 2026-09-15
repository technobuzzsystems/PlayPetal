-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('SETTLED', 'HELD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementPayoutStatus" AS ENUM ('UNPAID', 'RESERVED', 'PAID');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('SALE_GROSS', 'COMMISSION', 'PLATFORM_FEE', 'SELLER_ADJUSTMENT', 'SETTLEMENT_RELEASE', 'PAYOUT_RESERVED', 'PAYOUT_COMPLETED', 'PAYOUT_FAILED');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SellerSettlement" (
    "id" TEXT NOT NULL,
    "suborderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "platformFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adjustmentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payableAmount" DECIMAL(10,2) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'SETTLED',
    "payoutStatus" "SettlementPayoutStatus" NOT NULL DEFAULT 'UNPAID',
    "currentPayoutId" TEXT,
    "completedPayoutId" TEXT,
    "eligibilityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementLedgerEntry" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "settlementId" TEXT,
    "payoutId" TEXT,
    "suborderId" TEXT,
    "entryType" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPayout" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'SANDBOX',
    "providerPayoutId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPayoutSettlement" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerPayoutSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerSettlement_suborderId_key" ON "SellerSettlement"("suborderId");

-- CreateIndex
CREATE INDEX "SellerSettlement_sellerId_status_idx" ON "SellerSettlement"("sellerId", "status");

-- CreateIndex
CREATE INDEX "SellerSettlement_sellerId_payoutStatus_idx" ON "SellerSettlement"("sellerId", "payoutStatus");

-- CreateIndex
CREATE INDEX "SellerSettlement_suborderId_idx" ON "SellerSettlement"("suborderId");

-- CreateIndex
CREATE INDEX "SellerSettlement_settledAt_idx" ON "SellerSettlement"("settledAt");

-- CreateIndex
CREATE INDEX "SettlementLedgerEntry_sellerId_createdAt_idx" ON "SettlementLedgerEntry"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "SettlementLedgerEntry_settlementId_idx" ON "SettlementLedgerEntry"("settlementId");

-- CreateIndex
CREATE INDEX "SettlementLedgerEntry_payoutId_idx" ON "SettlementLedgerEntry"("payoutId");

-- CreateIndex
CREATE INDEX "SettlementLedgerEntry_entryType_idx" ON "SettlementLedgerEntry"("entryType");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPayout_providerPayoutId_key" ON "SellerPayout"("providerPayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPayout_idempotencyKey_key" ON "SellerPayout"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SellerPayout_sellerId_status_idx" ON "SellerPayout"("sellerId", "status");

-- CreateIndex
CREATE INDEX "SellerPayout_providerPayoutId_idx" ON "SellerPayout"("providerPayoutId");

-- CreateIndex
CREATE INDEX "SellerPayout_idempotencyKey_idx" ON "SellerPayout"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SellerPayoutSettlement_payoutId_idx" ON "SellerPayoutSettlement"("payoutId");

-- CreateIndex
CREATE INDEX "SellerPayoutSettlement_settlementId_idx" ON "SellerPayoutSettlement"("settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPayoutSettlement_payoutId_settlementId_key" ON "SellerPayoutSettlement"("payoutId", "settlementId");

-- AddForeignKey
ALTER TABLE "SellerSettlement" ADD CONSTRAINT "SellerSettlement_suborderId_fkey" FOREIGN KEY ("suborderId") REFERENCES "SellerSuborder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSettlement" ADD CONSTRAINT "SellerSettlement_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementLedgerEntry" ADD CONSTRAINT "SettlementLedgerEntry_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementLedgerEntry" ADD CONSTRAINT "SettlementLedgerEntry_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "SellerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementLedgerEntry" ADD CONSTRAINT "SettlementLedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "SellerPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayoutSettlement" ADD CONSTRAINT "SellerPayoutSettlement_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "SellerPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayoutSettlement" ADD CONSTRAINT "SellerPayoutSettlement_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "SellerSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
