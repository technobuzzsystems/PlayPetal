-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('FIRST_PARTY', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "OfferCondition" AS ENUM ('NEW', 'COLLECTOR_GRADE', 'OPEN_BOX');

-- CreateEnum
CREATE TYPE "WarrantyType" AS ENUM ('OFFICIAL_MANUFACTURER_WARRANTY', 'SELLER_WARRANTY', 'STANDARD_REPLACEMENT_ONLY');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PLAY_PETAL_EXPRESS', 'SELLER_DIRECT');

-- CreateEnum
CREATE TYPE "ProductModerationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OfferModerationStatus" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'COMMITTED', 'EXPIRED', 'RELEASED');

-- CreateEnum
CREATE TYPE "SuborderStatus" AS ENUM ('CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "brandNameSnapshot" TEXT,
ADD COLUMN     "imageSnapshot" TEXT,
ADD COLUMN     "masterProductId" TEXT,
ADD COLUMN     "masterProductIdSnapshot" TEXT,
ADD COLUMN     "offerId" TEXT,
ADD COLUMN     "offerIdSnapshot" TEXT,
ADD COLUMN     "productNameSnapshot" TEXT,
ADD COLUMN     "sellerIdSnapshot" TEXT,
ADD COLUMN     "sellerNameSnapshot" TEXT,
ADD COLUMN     "sellerSkuSnapshot" TEXT,
ADD COLUMN     "suborderId" TEXT,
ADD COLUMN     "unitPriceSnapshot" DECIMAL(10,2),
ADD COLUMN     "warrantySnapshot" TEXT,
ALTER COLUMN "orderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductMedia" ADD COLUMN     "masterProductId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VendorProfile" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "onTimeDispatchRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
ADD COLUMN     "orderCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
ADD COLUMN     "sellerType" "SellerType" NOT NULL DEFAULT 'THIRD_PARTY',
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MasterProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "masterSku" TEXT NOT NULL,
    "gtin" TEXT,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT,
    "ageGroupId" TEXT,
    "shortDescription" TEXT,
    "description" TEXT,
    "boxContents" JSONB,
    "features" JSONB,
    "specifications" JSONB,
    "safetyCertifications" JSONB,
    "hazardWarnings" TEXT,
    "dimensionsCm" JSONB,
    "weightGrams" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerOffer" (
    "id" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerSku" TEXT NOT NULL,
    "condition" "OfferCondition" NOT NULL DEFAULT 'NEW',
    "basePrice" DECIMAL(10,2) NOT NULL,
    "salePrice" DECIMAL(10,2),
    "effectivePrice" DECIMAL(10,2) NOT NULL,
    "warrantyType" "WarrantyType" NOT NULL DEFAULT 'SELLER_WARRANTY',
    "warrantyMonths" INTEGER NOT NULL DEFAULT 6,
    "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'SELLER_DIRECT',
    "estimatedDeliveryDays" INTEGER NOT NULL DEFAULT 5,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 7,
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "moderationStatus" "OfferModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferInventory" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "physicalStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "availableStock" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 5,
    "warehouseName" TEXT NOT NULL DEFAULT 'Primary Facility',
    "warehouseCity" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "sessionId" TEXT,
    "customerId" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerSuborder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "suborderNumber" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "sellerType" "SellerType" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "status" "SuborderStatus" NOT NULL DEFAULT 'CONFIRMED',
    "shippingCarrier" TEXT,
    "trackingNumber" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSuborder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "masterProductId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "verifiedBuyer" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Approved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerFeedback" (
    "id" TEXT NOT NULL,
    "suborderId" TEXT NOT NULL,
    "packagingRating" INTEGER NOT NULL,
    "deliveryRating" INTEGER NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterProduct_slug_key" ON "MasterProduct"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MasterProduct_masterSku_key" ON "MasterProduct"("masterSku");

-- CreateIndex
CREATE UNIQUE INDEX "MasterProduct_gtin_key" ON "MasterProduct"("gtin");

-- CreateIndex
CREATE INDEX "MasterProduct_slug_idx" ON "MasterProduct"("slug");

-- CreateIndex
CREATE INDEX "MasterProduct_categoryId_status_idx" ON "MasterProduct"("categoryId", "status");

-- CreateIndex
CREATE INDEX "MasterProduct_brandId_status_idx" ON "MasterProduct"("brandId", "status");

-- CreateIndex
CREATE INDEX "MasterProduct_ageGroupId_status_idx" ON "MasterProduct"("ageGroupId", "status");

-- CreateIndex
CREATE INDEX "MasterProduct_isFeatured_isBestSeller_isNewArrival_idx" ON "MasterProduct"("isFeatured", "isBestSeller", "isNewArrival");

-- CreateIndex
CREATE INDEX "SellerOffer_masterProductId_status_effectivePrice_idx" ON "SellerOffer"("masterProductId", "status", "effectivePrice");

-- CreateIndex
CREATE INDEX "SellerOffer_sellerId_status_idx" ON "SellerOffer"("sellerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SellerOffer_sellerId_masterProductId_key" ON "SellerOffer"("sellerId", "masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerOffer_sellerId_sellerSku_key" ON "SellerOffer"("sellerId", "sellerSku");

-- CreateIndex
CREATE UNIQUE INDEX "OfferInventory_offerId_key" ON "OfferInventory"("offerId");

-- CreateIndex
CREATE INDEX "OfferInventory_offerId_availableStock_idx" ON "OfferInventory"("offerId", "availableStock");

-- CreateIndex
CREATE INDEX "InventoryReservation_offerId_status_idx" ON "InventoryReservation"("offerId", "status");

-- CreateIndex
CREATE INDEX "InventoryReservation_expiresAt_status_idx" ON "InventoryReservation"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SellerSuborder_suborderNumber_key" ON "SellerSuborder"("suborderNumber");

-- CreateIndex
CREATE INDEX "SellerSuborder_orderId_idx" ON "SellerSuborder"("orderId");

-- CreateIndex
CREATE INDEX "SellerSuborder_sellerId_status_createdAt_idx" ON "SellerSuborder"("sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductReview_masterProductId_idx" ON "ProductReview"("masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_customerId_masterProductId_key" ON "ProductReview"("customerId", "masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerFeedback_suborderId_key" ON "SellerFeedback"("suborderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "OrderItem_suborderId_idx" ON "OrderItem"("suborderId");

-- CreateIndex
CREATE INDEX "OrderItem_offerId_idx" ON "OrderItem"("offerId");

-- CreateIndex
CREATE INDEX "OrderItem_masterProductId_idx" ON "OrderItem"("masterProductId");

-- CreateIndex
CREATE INDEX "OrderItem_offerIdSnapshot_idx" ON "OrderItem"("offerIdSnapshot");

-- CreateIndex
CREATE INDEX "OrderItem_masterProductIdSnapshot_idx" ON "OrderItem"("masterProductIdSnapshot");

-- CreateIndex
CREATE INDEX "ProductMedia_masterProductId_idx" ON "ProductMedia"("masterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_slug_key" ON "VendorProfile"("slug");

-- CreateIndex
CREATE INDEX "VendorProfile_sellerType_idx" ON "VendorProfile"("sellerType");

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterProduct" ADD CONSTRAINT "MasterProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterProduct" ADD CONSTRAINT "MasterProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterProduct" ADD CONSTRAINT "MasterProduct_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "AgeGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerOffer" ADD CONSTRAINT "SellerOffer_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerOffer" ADD CONSTRAINT "SellerOffer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferInventory" ADD CONSTRAINT "OfferInventory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SellerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SellerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSuborder" ADD CONSTRAINT "SellerSuborder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerSuborder" ADD CONSTRAINT "SellerSuborder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_suborderId_fkey" FOREIGN KEY ("suborderId") REFERENCES "SellerSuborder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SellerOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_masterProductId_fkey" FOREIGN KEY ("masterProductId") REFERENCES "MasterProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerFeedback" ADD CONSTRAINT "SellerFeedback_suborderId_fkey" FOREIGN KEY ("suborderId") REFERENCES "SellerSuborder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
