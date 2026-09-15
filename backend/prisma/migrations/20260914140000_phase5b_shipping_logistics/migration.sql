-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "suborderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SHIPROCKET',
    "providerShipmentId" TEXT,
    "awbNumber" TEXT,
    "shippingCarrier" TEXT,
    "labelUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "estimatedDeliveryDate" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "providerEventId" TEXT,
    "providerStatus" TEXT NOT NULL,
    "normalizedStatus" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_suborderId_key" ON "Shipment"("suborderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_providerShipmentId_key" ON "Shipment"("providerShipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_awbNumber_key" ON "Shipment"("awbNumber");

-- CreateIndex
CREATE INDEX "Shipment_suborderId_status_idx" ON "Shipment"("suborderId", "status");

-- CreateIndex
CREATE INDEX "Shipment_providerShipmentId_idx" ON "Shipment"("providerShipmentId");

-- CreateIndex
CREATE INDEX "Shipment_awbNumber_idx" ON "Shipment"("awbNumber");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingEvent_providerEventId_key" ON "TrackingEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_eventTimestamp_idx" ON "TrackingEvent"("shipmentId", "eventTimestamp");

-- CreateIndex
CREATE INDEX "TrackingEvent_providerEventId_idx" ON "TrackingEvent"("providerEventId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_suborderId_fkey" FOREIGN KEY ("suborderId") REFERENCES "SellerSuborder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
