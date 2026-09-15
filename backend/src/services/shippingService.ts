// ============================================================================
// PHASE 5B: SHIPPING SERVICE
// Authoritative shipping orchestration, provider lifecycle, AWB persistence,
// multi-event tracking history, cryptographically verified idempotent webhooks,
// and operational reconciliation.
// ============================================================================

import { prisma } from '../prisma/client';
import { getShippingProvider, NormalizedShipmentStatus } from './shipping';
import { logSecurityEvent } from '../utils/security';
import { SuborderStatus } from '@prisma/client';

export interface ShippingActor {
  id: string;
  role: string;
  vendorId?: string;
  email?: string;
  guestAccessToken?: string;
}

export class ShippingService {
  /**
   * Creates an authoritative courier shipment for a SellerSuborder.
   * Enforces strict RBAC (vendor owns suborder or admin), eligibility verification,
   * database-safe duplicate protection, AWB assignment, and suborder synchronization.
   */
  async createShipmentForSuborder(suborderId: string, actor: ShippingActor): Promise<any> {
    // 1. Role-based authorization
    if (actor.role === 'CUSTOMER') {
      throw new Error('FORBIDDEN: Customers are not permitted to create shipments.');
    }

    // 2. Fetch SellerSuborder with parent Order and items
    const suborder = await prisma.sellerSuborder.findUnique({
      where: { id: suborderId },
      include: {
        order: true,
        seller: { select: { id: true, shopName: true, sellerType: true } },
        items: true,
        shipment: {
          include: { trackingEvents: { orderBy: { eventTimestamp: 'asc' } } },
        },
      },
    });

    if (!suborder) {
      throw new Error('Suborder not found.');
    }

    // 3. Vendor ownership check
    if (actor.role === 'VENDOR') {
      if (!actor.vendorId || suborder.sellerId !== actor.vendorId) {
        throw new Error('FORBIDDEN: You do not own this suborder.');
      }
    }

    // 4. Duplicate Shipment Protection: Return existing shipment if already created
    if (suborder.shipment) {
      return this.formatShipmentResponse(suborder.shipment, suborder);
    }

    // 5. Shipping eligibility checks
    if (suborder.status === SuborderStatus.CANCELLED) {
      throw new Error('Cannot create shipment for a cancelled suborder.');
    }
    if (suborder.status === SuborderStatus.DELIVERED) {
      throw new Error('Suborder is already marked as delivered.');
    }
    if (suborder.order.status === 'Cancelled') {
      throw new Error('Cannot create shipment for a cancelled parent order.');
    }

    // Payment eligibility check: Online orders must be Paid; COD must be Confirmed
    const isCOD = suborder.order.paymentMethod.toLowerCase().includes('cash');
    if (!isCOD && suborder.order.paymentStatus !== 'Paid') {
      throw new Error('Cannot create shipment for an unpaid order. Payment must be captured first.');
    }

    // 6. Build server-authoritative package data
    const shippingAddress: any = suborder.order.shippingAddress || {};
    const packageItems = suborder.items.map((it) => ({
      name: it.productNameSnapshot || it.name,
      sku: it.sellerSkuSnapshot || it.sku || `SKU-${it.id.slice(0, 8)}`,
      units: it.quantity,
      sellingPrice: Number(it.unitPriceSnapshot || it.price),
    }));

    const packageData = {
      suborderId: suborder.id,
      suborderNumber: suborder.suborderNumber,
      orderNumber: suborder.order.orderNumber,
      orderDate: suborder.order.createdAt,
      customerName: suborder.order.customerName,
      customerEmail: suborder.order.customerEmail,
      customerPhone: suborder.order.customerPhone || undefined,
      shippingAddress: {
        street: shippingAddress.street || shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode || shippingAddress.pincode,
        country: shippingAddress.country || 'India',
      },
      items: packageItems,
      paymentMethod: suborder.order.paymentMethod,
      totalAmount: Number(suborder.totalAmount),
      sellerId: suborder.sellerId,
      sellerName: suborder.seller.shopName,
      weightGrams: 500,
    };

    // 7. Call courier provider abstraction
    const provider = getShippingProvider();
    const providerRes = await provider.createShipment(packageData);

    if (!providerRes.success) {
      logSecurityEvent('SHIPMENT_FAILED', {
        status: 'FAILURE',
        userId: actor.id,
        role: actor.role,
        resourceId: suborder.id,
        reason: `Courier provider failed to create shipment: ${providerRes.errorMessage}`,
      });
      throw new Error(providerRes.errorMessage || 'Courier provider failed to create shipment.');
    }

    // 8. Database transaction: persist Shipment, initial TrackingEvent, and synchronize SellerSuborder
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Double-check inside transaction to prevent concurrent duplicate inserts
        const existing = await tx.shipment.findUnique({
          where: { suborderId: suborder.id },
          include: { trackingEvents: true },
        });
        if (existing) {
          return existing;
        }

        const initialEventId = `${providerRes.awbNumber || providerRes.providerShipmentId}-INIT`;
        const newShipment = await tx.shipment.create({
          data: {
            suborderId: suborder.id,
            provider: providerRes.provider,
            providerShipmentId: providerRes.providerShipmentId,
            awbNumber: providerRes.awbNumber,
            shippingCarrier: providerRes.shippingCarrier,
            labelUrl: providerRes.labelUrl,
            status: providerRes.status,
            trackingEvents: {
              create: {
                providerEventId: initialEventId,
                providerStatus: 'MANIFEST_GENERATED',
                normalizedStatus: providerRes.status,
                location: 'Merchant Warehouse',
                description: `Shipment booked with ${providerRes.shippingCarrier}. AWB: ${providerRes.awbNumber || 'PENDING'}`,
                eventTimestamp: new Date(),
              },
            },
          },
          include: { trackingEvents: true },
        });

        // Synchronize legacy and operational suborder fields
        await tx.sellerSuborder.update({
          where: { id: suborder.id },
          data: {
            shippingCarrier: providerRes.shippingCarrier,
            trackingNumber: providerRes.awbNumber,
            status: providerRes.status === 'AWB_ASSIGNED' ? SuborderStatus.PROCESSING : suborder.status,
          },
        });

        return newShipment;
      });

      // 9. Audit Logging
      logSecurityEvent('SHIPMENT_CREATED', {
        status: 'SUCCESS',
        userId: actor.id,
        role: actor.role,
        resourceId: result.id,
        reason: `Shipment created for suborder ${suborder.suborderNumber} via ${result.shippingCarrier}`,
      });

      if (result.awbNumber) {
        logSecurityEvent('AWB_ASSIGNED', {
          status: 'SUCCESS',
          userId: actor.id,
          role: actor.role,
          resourceId: result.id,
          reason: `AWB ${result.awbNumber} assigned for suborder ${suborder.suborderNumber}`,
        });
      }

      return this.formatShipmentResponse(result, suborder);
    } catch (err: any) {
      // If unique constraint violation occurred in race condition, fetch and return the winning record
      if (err.code === 'P2002') {
        const raceWinner = await prisma.shipment.findUnique({
          where: { suborderId: suborder.id },
          include: { trackingEvents: { orderBy: { eventTimestamp: 'asc' } } },
        });
        if (raceWinner) {
          return this.formatShipmentResponse(raceWinner, suborder);
        }
      }
      throw err;
    }
  }

  /**
   * Retrieves tracking details for a shipment or suborder with strict role-based access control.
   */
  async getShipmentTracking(shipmentIdOrSuborderId: string, actor: ShippingActor): Promise<any> {
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [{ id: shipmentIdOrSuborderId }, { suborderId: shipmentIdOrSuborderId }],
      },
      include: {
        suborder: {
          include: {
            order: true,
            seller: { select: { id: true, shopName: true } },
            items: true,
          },
        },
        trackingEvents: {
          orderBy: { eventTimestamp: 'asc' },
        },
      },
    });

    if (!shipment) {
      throw new Error('Shipment not found.');
    }

    // Role-scoped authorization
    if (actor.role === 'ADMIN') {
      // Global access authorized
    } else if (actor.role === 'VENDOR') {
      if (shipment.suborder.sellerId !== actor.vendorId) {
        throw new Error('FORBIDDEN: You do not own this shipment.');
      }
    } else if (actor.role === 'CUSTOMER') {
      const isOwner = shipment.suborder.order.customerId && shipment.suborder.order.customerId === actor.id;
      const isGuestAuthorized = actor.guestAccessToken && shipment.suborder.order.guestAccessToken === actor.guestAccessToken;

      if (!isOwner && !isGuestAuthorized) {
        throw new Error('FORBIDDEN: You do not have access to view this shipment tracking.');
      }
    }

    return this.formatShipmentResponse(shipment, shipment.suborder);
  }

  /**
   * Processes an incoming logistics webhook event with cryptographic signature verification
   * and database-backed idempotency.
   */
  async processWebhook(rawBody: string | Buffer, signature: string, payload: any): Promise<any> {
    const provider = getShippingProvider();

    // 1. Cryptographic HMAC verification
    const isValid = provider.verifyWebhook(rawBody, signature);
    if (!isValid) {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        status: 'FAILURE',
        reason: 'Invalid or forged shipping webhook signature rejected.',
      });
      throw new Error('INVALID_WEBHOOK_SIGNATURE: Forged or corrupted shipping webhook payload.');
    }

    // 2. Parse provider event payload
    const event = provider.parseWebhookPayload(payload);

    // 3. Locate target shipment
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          event.awbNumber ? { awbNumber: event.awbNumber } : undefined,
          event.providerShipmentId ? { providerShipmentId: event.providerShipmentId } : undefined,
          event.suborderNumber ? { suborder: { suborderNumber: event.suborderNumber } } : undefined,
        ].filter(Boolean) as any,
      },
      include: { suborder: true },
    });

    if (!shipment) {
      return { status: 'ignored', reason: 'Shipment not found for webhook event.' };
    }

    // 4. Database-Safe Idempotency: Check if this provider event was already processed
    const existingEvent = await prisma.trackingEvent.findUnique({
      where: { providerEventId: event.providerEventId },
    });

    if (existingEvent) {
      logSecurityEvent('SHIPPING_WEBHOOK_REPLAY', {
        status: 'INFO',
        resourceId: shipment.id,
        reason: `Replay webhook event ${event.providerEventId} safely acknowledged without duplicate mutations`,
      });
      return { status: 'processed', replay: true, eventId: event.providerEventId };
    }

    // 5. Atomic state update in transaction
    await prisma.$transaction(async (tx) => {
      // A. Record tracking timeline event
      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          providerEventId: event.providerEventId,
          providerStatus: event.providerStatus,
          normalizedStatus: event.normalizedStatus,
          location: event.location,
          description: event.description,
          eventTimestamp: event.eventTimestamp,
        },
      });

      // B. Update Shipment state and timestamps
      const isDelivered = event.normalizedStatus === 'DELIVERED';
      const isShipped = event.normalizedStatus === 'PICKED_UP' || event.normalizedStatus === 'IN_TRANSIT';
      const isCancelled = event.normalizedStatus === 'CANCELLED';
      const isFailed = event.normalizedStatus === 'FAILED' || event.normalizedStatus === 'RTO';

      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: event.normalizedStatus,
          shippedAt: isShipped && !shipment.shippedAt ? event.eventTimestamp : undefined,
          deliveredAt: isDelivered && !shipment.deliveredAt ? event.eventTimestamp : undefined,
          cancelledAt: isCancelled && !shipment.cancelledAt ? event.eventTimestamp : undefined,
          failureReason: isFailed ? event.description : undefined,
        },
      });

      // C. Synchronize SellerSuborder operational status
      let targetSuborderStatus: SuborderStatus | undefined;
      if (event.normalizedStatus === 'AWB_ASSIGNED') {
        targetSuborderStatus = SuborderStatus.PROCESSING;
      } else if (event.normalizedStatus === 'PICKED_UP' || event.normalizedStatus === 'IN_TRANSIT') {
        targetSuborderStatus = SuborderStatus.SHIPPED;
      } else if (event.normalizedStatus === 'OUT_FOR_DELIVERY') {
        targetSuborderStatus = SuborderStatus.OUT_FOR_DELIVERY;
      } else if (event.normalizedStatus === 'DELIVERED') {
        targetSuborderStatus = SuborderStatus.DELIVERED;
      }

      if (targetSuborderStatus) {
        await tx.sellerSuborder.update({
          where: { id: shipment.suborderId },
          data: {
            status: targetSuborderStatus,
            dispatchedAt: isShipped && !shipment.suborder.dispatchedAt ? event.eventTimestamp : undefined,
            deliveredAt: isDelivered && !shipment.suborder.deliveredAt ? event.eventTimestamp : undefined,
          },
        });
      }
    });

    // 6. Security Audit Logging
    logSecurityEvent('SHIPPING_WEBHOOK_VERIFIED', {
      status: 'SUCCESS',
      resourceId: shipment.id,
      reason: `Webhook processed for shipment ${shipment.id}: status -> ${event.normalizedStatus}`,
    });

    logSecurityEvent('SHIPMENT_STATUS_UPDATED', {
      status: 'SUCCESS',
      resourceId: shipment.id,
      reason: `Shipment ${shipment.id} status updated from ${shipment.status} to ${event.normalizedStatus}`,
    });

    if (event.normalizedStatus === 'DELIVERED') {
      logSecurityEvent('SHIPMENT_DELIVERED', {
        status: 'SUCCESS',
        resourceId: shipment.id,
        reason: `Shipment ${shipment.id} delivered to customer`,
      });
    } else if (event.normalizedStatus === 'FAILED' || event.normalizedStatus === 'RTO') {
      logSecurityEvent('SHIPMENT_FAILED', {
        status: 'WARNING',
        resourceId: shipment.id,
        reason: `Shipment ${shipment.id} delivery exception: ${event.description}`,
      });
    }

    return {
      status: 'processed',
      replay: false,
      shipmentId: shipment.id,
      newStatus: event.normalizedStatus,
    };
  }

  /**
   * Operational reconciliation engine: scans for missing AWBs, stuck shipments,
   * delivery exceptions, and status discrepancies between internal suborders and shipments.
   */
  async getShippingReconciliation(): Promise<any> {
    const allShipments = await prisma.shipment.findMany({
      include: {
        suborder: {
          include: {
            order: { select: { id: true, orderNumber: true, customerName: true, status: true, paymentStatus: true } },
            seller: { select: { id: true, shopName: true } },
          },
        },
        trackingEvents: { orderBy: { eventTimestamp: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const fortyEightHoursAgo = new Date(now - 48 * 3600 * 1000);
    const seventyTwoHoursAgo = new Date(now - 72 * 3600 * 1000);

    const discrepancies: any[] = [];
    let missingAwbCount = 0;
    let stuckProcessingCount = 0;
    let stuckInTransitCount = 0;
    let failedDeliveryCount = 0;
    let rtoCount = 0;

    for (const shp of allShipments) {
      // 1. Missing AWB check
      if (!shp.awbNumber) {
        missingAwbCount++;
        discrepancies.push({
          type: 'MISSING_AWB',
          severity: 'HIGH',
          shipmentId: shp.id,
          suborderNumber: shp.suborder.suborderNumber,
          sellerName: shp.suborder.seller.shopName,
          description: 'Shipment created but courier AWB is missing or unassigned.',
          createdAt: shp.createdAt,
        });
      }

      // 2. Stuck in PROCESSING / AWB_ASSIGNED (>48h)
      if ((shp.status === 'CREATED' || shp.status === 'AWB_ASSIGNED') && shp.createdAt < fortyEightHoursAgo) {
        stuckProcessingCount++;
        discrepancies.push({
          type: 'STUCK_PROCESSING',
          severity: 'MEDIUM',
          shipmentId: shp.id,
          suborderNumber: shp.suborder.suborderNumber,
          sellerName: shp.suborder.seller.shopName,
          description: 'Shipment has been pending pickup for more than 48 hours.',
          createdAt: shp.createdAt,
        });
      }

      // 3. Stuck in IN_TRANSIT / SHIPPED (>72h without delivery)
      if ((shp.status === 'PICKED_UP' || shp.status === 'IN_TRANSIT') && shp.shippedAt && shp.shippedAt < seventyTwoHoursAgo) {
        stuckInTransitCount++;
        discrepancies.push({
          type: 'STUCK_IN_TRANSIT',
          severity: 'HIGH',
          shipmentId: shp.id,
          suborderNumber: shp.suborder.suborderNumber,
          sellerName: shp.suborder.seller.shopName,
          description: 'Shipment in transit for more than 72 hours without delivery milestone.',
          shippedAt: shp.shippedAt,
        });
      }

      // 4. Failed Deliveries / RTO
      if (shp.status === 'FAILED') {
        failedDeliveryCount++;
        discrepancies.push({
          type: 'DELIVERY_FAILED',
          severity: 'HIGH',
          shipmentId: shp.id,
          suborderNumber: shp.suborder.suborderNumber,
          sellerName: shp.suborder.seller.shopName,
          description: `Delivery failed: ${shp.failureReason || 'Undelivered by carrier'}`,
        });
      } else if (shp.status === 'RTO') {
        rtoCount++;
        discrepancies.push({
          type: 'RTO_INITIATED',
          severity: 'CRITICAL',
          shipmentId: shp.id,
          suborderNumber: shp.suborder.suborderNumber,
          sellerName: shp.suborder.seller.shopName,
          description: 'Package being returned to origin (RTO).',
        });
      }

      // 5. Status Mismatch between Shipment and Suborder
      if (shp.status === 'DELIVERED' && shp.suborder.status !== SuborderStatus.DELIVERED) {
        discrepancies.push({
          type: 'STATUS_MISMATCH',
          severity: 'HIGH',
          shipmentId: shp.id,
          suborderNumber: shp.suborder.suborderNumber,
          sellerName: shp.suborder.seller.shopName,
          description: `Shipment is DELIVERED but SellerSuborder is ${shp.suborder.status}.`,
        });
      }
    }

    if (discrepancies.length > 0) {
      logSecurityEvent('SHIPPING_RECONCILIATION_MISMATCH', {
        status: 'WARNING',
        reason: `Shipping reconciliation detected ${discrepancies.length} discrepancies.`,
      });
    }

    return {
      summary: {
        totalShipments: allShipments.length,
        missingAwbCount,
        stuckProcessingCount,
        stuckInTransitCount,
        failedDeliveryCount,
        rtoCount,
        totalDiscrepancies: discrepancies.length,
      },
      discrepancies,
      recentShipments: allShipments.slice(0, 15).map((s) => ({
        id: s.id,
        suborderNumber: s.suborder.suborderNumber,
        sellerName: s.suborder.seller.shopName,
        carrier: s.shippingCarrier,
        awbNumber: s.awbNumber,
        status: s.status,
        shippedAt: s.shippedAt,
        deliveredAt: s.deliveredAt,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * Helper to format consistent shipment responses.
   */
  private formatShipmentResponse(shipment: any, suborder: any): any {
    return {
      id: shipment.id,
      suborderId: shipment.suborderId,
      suborderNumber: suborder.suborderNumber,
      orderId: suborder.orderId,
      orderNumber: suborder.order?.orderNumber,
      sellerId: suborder.sellerId,
      sellerName: suborder.seller?.shopName || suborder.sellerName,
      provider: shipment.provider,
      providerShipmentId: shipment.providerShipmentId,
      awbNumber: shipment.awbNumber,
      shippingCarrier: shipment.shippingCarrier,
      labelUrl: shipment.labelUrl,
      status: shipment.status,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      shippedAt: shipment.shippedAt,
      deliveredAt: shipment.deliveredAt,
      cancelledAt: shipment.cancelledAt,
      failureReason: shipment.failureReason,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
      trackingEvents: (shipment.trackingEvents || []).map((ev: any) => ({
        id: ev.id,
        providerEventId: ev.providerEventId,
        providerStatus: ev.providerStatus,
        normalizedStatus: ev.normalizedStatus,
        location: ev.location,
        description: ev.description,
        eventTimestamp: ev.eventTimestamp,
      })),
    };
  }
}

export const shippingService = new ShippingService();
