-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT,
    "webhookEventId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_gatewayOrderId_key" ON "PaymentAttempt"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_gatewayPaymentId_key" ON "PaymentAttempt"("gatewayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_webhookEventId_key" ON "PaymentAttempt"("webhookEventId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_orderId_status_idx" ON "PaymentAttempt"("orderId", "status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_gatewayOrderId_idx" ON "PaymentAttempt"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_gatewayPaymentId_idx" ON "PaymentAttempt"("gatewayPaymentId");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;