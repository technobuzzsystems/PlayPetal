-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED_TO_SELLER', 'INSPECTED', 'REFUND_APPROVED', 'REFUNDED', 'REPLACEMENT_OFFERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED_ON_DELIVERY', 'DEFECTIVE_OR_NOT_WORKING', 'WRONG_ITEM_SENT', 'NOT_AS_DESCRIBED', 'QUALITY_NOT_ACCEPTABLE', 'MISSING_PARTS_OR_ACCESSORIES', 'SIZE_OR_FIT_INCORRECT', 'CUSTOMER_CHANGED_MIND');

-- CreateEnum
CREATE TYPE "InspectionOutcome" AS ENUM ('ACCEPT_FULL_REFUND', 'ACCEPT_PARTIAL_REFUND', 'REJECT_DAMAGED_BY_CUSTOMER', 'REJECT_POLICY_VIOLATION');

-- CreateEnum
CREATE TYPE "ReverseShipmentStatus" AS ENUM ('PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'CANCELLED', 'RTO');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'MANUAL_REFUND_COMPLETED');

-- CreateEnum
CREATE TYPE "RefundProvider" AS ENUM ('RAZORPAY', 'COD_MANUAL');

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "suborderId" TEXT NOT NULL,
    "customerId" TEXT,
    "sellerId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" "ReturnReason" NOT NULL,
    "customerNotes" TEXT,
    "rejectionReason" TEXT,
    "inspectionNotes" TEXT,
    "refundAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "adminNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "refundAmount" DECIMAL(10,2) NOT NULL,
    "approvedQuantity" INTEGER NOT NULL DEFAULT 0,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "refundedQuantity" INTEGER NOT NULL DEFAULT 0,
    "inspectionOutcome" "InspectionOutcome",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnShipment" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SHIPROCKET',
    "providerShipmentId" TEXT,
    "awbNumber" TEXT,
    "shippingCarrier" TEXT,
    "labelUrl" TEXT,
    "status" "ReverseShipmentStatus" NOT NULL DEFAULT 'PICKUP_SCHEDULED',
    "pickupAddress" JSONB,
    "deliveryAddress" JSONB,
    "estimatedDeliveryDate" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnTrackingEvent" (
    "id" TEXT NOT NULL,
    "returnShipmentId" TEXT NOT NULL,
    "providerEventId" TEXT,
    "providerStatus" TEXT NOT NULL,
    "normalizedStatus" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "eventTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "returnRequestId" TEXT,
    "paymentAttemptId" TEXT,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" "RefundProvider" NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "failureReason" TEXT,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundItem" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "returnItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundPaymentAllocation" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "paymentAttemptId" TEXT,
    "suborderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundPaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_returnNumber_key" ON "ReturnRequest"("returnNumber");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_suborderId_idx" ON "ReturnRequest"("suborderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_sellerId_status_idx" ON "ReturnRequest"("sellerId", "status");

-- CreateIndex
CREATE INDEX "ReturnRequest_customerId_idx" ON "ReturnRequest"("customerId");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");

-- CreateIndex
CREATE INDEX "ReturnRequest_createdAt_idx" ON "ReturnRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ReturnItem_returnRequestId_idx" ON "ReturnItem"("returnRequestId");

-- CreateIndex
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnShipment_returnRequestId_key" ON "ReturnShipment"("returnRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnShipment_providerShipmentId_key" ON "ReturnShipment"("providerShipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnShipment_awbNumber_key" ON "ReturnShipment"("awbNumber");

-- CreateIndex
CREATE INDEX "ReturnShipment_returnRequestId_status_idx" ON "ReturnShipment"("returnRequestId", "status");

-- CreateIndex
CREATE INDEX "ReturnShipment_providerShipmentId_idx" ON "ReturnShipment"("providerShipmentId");

-- CreateIndex
CREATE INDEX "ReturnShipment_awbNumber_idx" ON "ReturnShipment"("awbNumber");

-- CreateIndex
CREATE INDEX "ReturnShipment_status_idx" ON "ReturnShipment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnTrackingEvent_providerEventId_key" ON "ReturnTrackingEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "ReturnTrackingEvent_returnShipmentId_eventTimestamp_idx" ON "ReturnTrackingEvent"("returnShipmentId", "eventTimestamp");

-- CreateIndex
CREATE INDEX "ReturnTrackingEvent_providerEventId_idx" ON "ReturnTrackingEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundNumber_key" ON "Refund"("refundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_orderId_status_idx" ON "Refund"("orderId", "status");

-- CreateIndex
CREATE INDEX "Refund_returnRequestId_idx" ON "Refund"("returnRequestId");

-- CreateIndex
CREATE INDEX "Refund_sellerId_status_idx" ON "Refund"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Refund_paymentAttemptId_idx" ON "Refund"("paymentAttemptId");

-- CreateIndex
CREATE INDEX "Refund_providerRefundId_idx" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE INDEX "Refund_idempotencyKey_idx" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RefundItem_refundId_idx" ON "RefundItem"("refundId");

-- CreateIndex
CREATE INDEX "RefundItem_returnItemId_idx" ON "RefundItem"("returnItemId");

-- CreateIndex
CREATE INDEX "RefundPaymentAllocation_refundId_idx" ON "RefundPaymentAllocation"("refundId");

-- CreateIndex
CREATE INDEX "RefundPaymentAllocation_paymentAttemptId_idx" ON "RefundPaymentAllocation"("paymentAttemptId");

-- CreateIndex
CREATE INDEX "RefundPaymentAllocation_suborderId_idx" ON "RefundPaymentAllocation"("suborderId");

-- CreateIndex
CREATE INDEX "RefundPaymentAllocation_sellerId_idx" ON "RefundPaymentAllocation"("sellerId");

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_suborderId_fkey" FOREIGN KEY ("suborderId") REFERENCES "SellerSuborder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnShipment" ADD CONSTRAINT "ReturnShipment_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnTrackingEvent" ADD CONSTRAINT "ReturnTrackingEvent_returnShipmentId_fkey" FOREIGN KEY ("returnShipmentId") REFERENCES "ReturnShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_returnItemId_fkey" FOREIGN KEY ("returnItemId") REFERENCES "ReturnItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundPaymentAllocation" ADD CONSTRAINT "RefundPaymentAllocation_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundPaymentAllocation" ADD CONSTRAINT "RefundPaymentAllocation_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundPaymentAllocation" ADD CONSTRAINT "RefundPaymentAllocation_suborderId_fkey" FOREIGN KEY ("suborderId") REFERENCES "SellerSuborder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundPaymentAllocation" ADD CONSTRAINT "RefundPaymentAllocation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

