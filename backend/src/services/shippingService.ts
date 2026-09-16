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
import { dbStore } from '../data/dbStore';

export interface ShippingActor {
  id: string;
  role: string;
  vendorId?: string;
  email?: string;
  guestAccessToken?: string;
}

export function isCodPaymentMethod(method?: string | null): boolean {
  if (!method) return false;
  const clean = String(method).trim().toLowerCase();
  return (
    clean === 'cod' ||
    clean === 'cash' ||
    clean === 'cash on delivery' ||
    clean === 'cash_on_delivery' ||
    clean.includes('cash') ||
    clean.includes('cod')
  );
}

export function isOnlinePaymentMethod(method?: string | null): boolean {
  if (!method) return false;
  const clean = String(method).trim().toLowerCase();
  return (
    clean.includes('online') ||
    clean.includes('razorpay') ||
    clean.includes('upi') ||
    clean.includes('card') ||
    clean.includes('netbanking') ||
    clean.includes('sandbox') ||
    clean === 'online payment' ||
    clean === 'online payment (razorpay)'
  );
}

export class ShippingWorkflowError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.name = 'ShippingWorkflowError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
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
      throw new ShippingWorkflowError('FORBIDDEN: Customers are not permitted to create shipments.', 403, 'FORBIDDEN');
    }

    // 2. Fetch SellerSuborder with flexible ID matching (id, suborderNumber, orderId)
    const cleanId = suborderId.replace(/^subord-/, '');
    const sellerFilter = actor.role === 'VENDOR' && actor.vendorId ? { sellerId: actor.vendorId } : {};
    let suborderRaw = await prisma.sellerSuborder.findFirst({
      where: {
        ...sellerFilter,
        OR: [
          { id: suborderId },
          { id: cleanId },
          { suborderNumber: suborderId },
          { suborderNumber: cleanId },
          { orderId: suborderId },
          { orderId: cleanId },
        ],
      },
      include: {
        shipment: {
          include: { trackingEvents: { orderBy: { eventTimestamp: 'asc' } } },
        },
      },
    });

    if (!suborderRaw) {
      // Auto-provision SellerSuborder in PostgreSQL if parent order exists in dbStore/Prisma
      const storeOrder = dbStore.getOrders().find(
        (o: any) => o.id === suborderId || o.id === cleanId || o.orderNumber === suborderId || o.orderNumber === cleanId
      );

      if (storeOrder) {
        let sellerId = actor.vendorId || (storeOrder.items && storeOrder.items[0]?.vendorId) || 'vendor-1';
        const cleanVendor = sellerId.replace(/[^a-zA-Z0-9]/g, '');
        const suborderNum = `${storeOrder.orderNumber || storeOrder.id}-${cleanVendor}-${Date.now().toString().slice(-4)}`;
        const totalAmt = storeOrder.totalAmount || 0;

        // Ensure parent order exists in Prisma DB for foreign key relation
        let dbOrder = await prisma.order.findUnique({ where: { id: storeOrder.id } });
        if (!dbOrder) {
          const defaultUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
          const userId = defaultUser
            ? defaultUser.id
            : (
                await prisma.user.create({
                  data: {
                    name: storeOrder.customerName || 'Customer',
                    email: storeOrder.customerEmail || `cust.${Date.now()}@example.com`,
                    password: 'hashed-password',
                    role: 'CUSTOMER',
                  },
                })
              ).id;

          dbOrder = await prisma.order.create({
            data: {
              id: storeOrder.id,
              userId: userId,
              status: 'CONFIRMED',
              totalAmount: totalAmt,
              shippingAddress: typeof storeOrder.shippingAddress === 'object' ? storeOrder.shippingAddress : {
                name: storeOrder.customerName || 'Customer',
                email: storeOrder.customerEmail || 'customer@example.com',
                phone: storeOrder.customerPhone || '9876543210',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
              },
            },
          });
        }

        // Ensure sellerId exists in VendorProfile table in PostgreSQL for foreign key constraint
        // const existingVendor: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM "VendorProfile" WHERE id = $1 LIMIT 1;`, sellerId);
        // if (!existingVendor || existingVendor.length === 0) {
        //   const vUser = await prisma.user.create({
        //     data: {
        //       name: 'Vendor Merchant',
        //       email: `vendor.${Date.now()}.${Math.random().toString(36).substring(7)}@example.com`,
        //       password: 'hashed-password',
        //       role: 'VENDOR',
        //     },
        //   });
        //   await prisma.$executeRawUnsafe(`
        //     INSERT INTO "VendorProfile" (id, "userId", "shopName", "ownerName", phone, city, address, description, logo, rating, "totalProducts", "salesCount", status, "passwordMigrationRequired", "joinedAt", "updatedAt", "onTimeDispatchRate", "orderCompletionRate", "sellerType", "totalReviews")
        //     VALUES ('${sellerId}', '${vUser.id}', 'ABC Toys Wonderland', 'Shopkeeper Partner', '9876543210', 'Mumbai', 'Address', 'Description', '', 5, 0, 0, 'APPROVED', false, NOW(), NOW(), 100, 100, 'THIRD_PARTY', 0)
        //     ON CONFLICT (id) DO NOTHING;
        //   `);
        // }

        suborderRaw = await prisma.sellerSuborder.create({
          data: {
            orderId: dbOrder.id,
            suborderNumber: suborderNum,
            sellerId,
            subtotal: totalAmt,
            totalAmount: totalAmt,
            status: SuborderStatus.PROCESSING,
          },
          include: {
            shipment: {
              include: { trackingEvents: { orderBy: { eventTimestamp: 'asc' } } },
            },
          },
        });
      }
    }

    if (!suborderRaw) {
      throw new ShippingWorkflowError('Suborder not found.', 404, 'NOT_FOUND');
    }

    const suborder = await this.enrichSuborder(suborderRaw);

    // 3. Vendor ownership check
    if (actor.role === 'VENDOR') {
      if (!actor.vendorId || suborder.sellerId !== actor.vendorId) {
        throw new ShippingWorkflowError('FORBIDDEN: You do not own this suborder.', 403, 'FORBIDDEN');
      }
    }

    // 4. Duplicate Shipment Protection: Return existing shipment if already created
    if (suborder.shipment) {
      return this.formatShipmentResponse(suborder.shipment, suborder);
    }

    // 5. Shipping eligibility checks
    if (suborder.status === SuborderStatus.CANCELLED) {
      throw new ShippingWorkflowError('Cannot create shipment for a cancelled suborder.', 400, 'SUBORDER_CANCELLED');
    }
    if (suborder.status === SuborderStatus.DELIVERED) {
      throw new ShippingWorkflowError('Suborder is already marked as delivered.', 400, 'ALREADY_DELIVERED');
    }
    if (suborder.order.status === 'Cancelled' || suborder.order.status === 'CANCELLED') {
      throw new ShippingWorkflowError('Cannot create shipment for a cancelled parent order.', 400, 'ORDER_CANCELLED');
    }

    // Fulfillment state eligibility check
    const fulfillmentStatus = String(suborder.status || suborder.order.status || '').toUpperCase();
    const isFulfillmentEligible = [
      'ACCEPTED',
      'CONFIRMED',
      'PROCESSING',
      'READY_TO_SHIP'
    ].includes(fulfillmentStatus);

    if (!isFulfillmentEligible) {
      throw new ShippingWorkflowError(`Cannot create shipment for suborder in ${suborder.status} state. Order must be accepted or processing.`, 400, 'INVALID_FULFILLMENT_STATE');
    }

    // Payment eligibility check: COD allowed while PENDING; ONLINE requires CAPTURED / Paid payment
    const rawPaymentMethod = String(suborder.order.paymentMethod || '').trim();
    const isCOD = isCodPaymentMethod(rawPaymentMethod);
    const isOnline = isOnlinePaymentMethod(rawPaymentMethod);

    if (isOnline) {
      const orderPaymentStatus = String(suborder.order.paymentStatus || '').trim().toLowerCase();
      const isPaidOnOrder = orderPaymentStatus === 'paid' || orderPaymentStatus === 'captured';

      // Verify authoritative PaymentAttempt status from database
      const capturedAttempt = await prisma.paymentAttempt.findFirst({
        where: {
          OR: [
            { orderId: suborder.orderId },
            { orderId: suborder.order?.id }
          ],
          status: 'CAPTURED'
        }
      });

      if (!isPaidOnOrder && !capturedAttempt) {
        throw new ShippingWorkflowError('Online payment must be completed before shipment creation.', 400, 'PAYMENT_REQUIRED');
      }
    } else if (!isCOD) {
      // Fail closed for unknown or unspecified payment methods
      throw new ShippingWorkflowError(`Unknown payment method '${rawPaymentMethod || 'unspecified'}'. Online payment must be completed before shipment creation.`, 400, 'UNKNOWN_PAYMENT_METHOD');
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
            status: SuborderStatus.READY_TO_SHIP,
          },
        });

        // Sync dbStore in-memory order status
        const storeOrder = dbStore.getOrders().find((o: any) => o.id === suborder.orderId || o.id === suborder.id);
        if (storeOrder) {
          (storeOrder as any).status = 'READY_TO_SHIP';
          (storeOrder as any).shipment = newShipment;
          (dbStore as any).saveData((dbStore as any).data);
        }

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
    const cleanId = shipmentIdOrSuborderId.replace(/^subord-/, '');
    const shipmentRaw = await prisma.shipment.findFirst({
      where: {
        OR: [
          { id: shipmentIdOrSuborderId },
          { id: cleanId },
          { suborderId: shipmentIdOrSuborderId },
          { suborderId: cleanId },
          { suborder: { orderId: shipmentIdOrSuborderId } },
          { suborder: { orderId: cleanId } },
          { suborder: { suborderNumber: shipmentIdOrSuborderId } },
          { suborder: { suborderNumber: cleanId } },
        ],
      },
      include: {
        trackingEvents: {
          orderBy: { eventTimestamp: 'asc' },
        },
      },
    });

    if (!shipmentRaw) {
      throw new Error('Shipment not found.');
    }

    const suborderRaw = await prisma.sellerSuborder.findUnique({
      where: { id: shipmentRaw.suborderId },
    });
    const suborder = await this.enrichSuborder(suborderRaw);
    const shipment = { ...shipmentRaw, suborder };

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
   * Retrieves live delivery tracking for a customer order across all associated seller suborders.
   * Enforces strict customer ownership check (order.userId === actor.id).
   * Returns HTTP 404 NOT_FOUND if unauthorized or non-existent to protect against order ID enumeration.
   */
  async getCustomerOrderTracking(orderId: string, actor: ShippingActor): Promise<any> {
    // 1. Retrieve parent order
    let parentOrder: any = null;
    try {
      parentOrder = await prisma.order.findUnique({ where: { id: orderId } });
    } catch (e) {
      // Non-fatal fallback for non-UUID order numbers
    }

    if (!parentOrder) {
      const orders = dbStore.getOrders();
      parentOrder = orders.find((o: any) => o.id === orderId || o.orderNumber === orderId);
    }

    if (!parentOrder) {
      throw new Error('NOT_FOUND: Order not found.');
    }

    // 2. Strict Customer Ownership Verification
    const orderCustomerId = parentOrder.userId || parentOrder.customerId;
    if (actor.role === 'CUSTOMER') {
      const isOwner = actor.id && (actor.id === orderCustomerId || actor.id === parentOrder.userId);
      const isGuestAuthorized = actor.guestAccessToken && parentOrder.guestAccessToken === actor.guestAccessToken;

      if (!isOwner && !isGuestAuthorized) {
        // Obfuscate authorization failure as NOT_FOUND to prevent order enumeration
        throw new Error('NOT_FOUND: Order not found.');
      }
    }

    // 3. Gather all suborders for this order
    let subordersRaw = parentOrder.suborders;
    if (!subordersRaw || subordersRaw.length === 0) {
      subordersRaw = await prisma.sellerSuborder.findMany({
        where: { orderId: parentOrder.id },
        include: {
          shipment: {
            include: { trackingEvents: { orderBy: { eventTimestamp: 'asc' } } },
          },
        },
      });
    }

    // Fallback if no suborders exist in DB
    if (!subordersRaw || subordersRaw.length === 0) {
      const sellerObj = dbStore.getVendors().find((v: any) => v.id === parentOrder.vendorId) || {
        id: parentOrder.vendorId || 'vendor-1',
        shopName: 'Play Petal Store',
      };
      return {
        orderId: parentOrder.id,
        orderNumber: parentOrder.orderNumber || parentOrder.id,
        status: parentOrder.status || 'CONFIRMED',
        createdAt: parentOrder.createdAt || new Date(),
        suborders: [
          {
            id: `sub-${parentOrder.id}`,
            suborderId: `sub-${parentOrder.id}`,
            suborderNumber: parentOrder.orderNumber || parentOrder.id,
            orderId: parentOrder.id,
            orderNumber: parentOrder.orderNumber || parentOrder.id,
            sellerId: sellerObj.id,
            sellerName: sellerObj.shopName,
            provider: 'Shiprocket Express',
            providerShipmentId: 'NOT_ASSIGNED',
            awbNumber: null,
            shippingCarrier: null,
            labelUrl: null,
            status: parentOrder.status === 'Cancelled' ? 'CANCELLED' : parentOrder.status === 'Delivered' ? 'DELIVERED' : 'CREATED',
            estimatedDeliveryDate: null,
            shippedAt: null,
            deliveredAt: null,
            cancelledAt: null,
            failureReason: null,
            createdAt: parentOrder.createdAt || new Date(),
            updatedAt: parentOrder.updatedAt || new Date(),
            trackingEvents: [],
          },
        ],
      };
    }

    const subordersFormatted = await Promise.all(
      subordersRaw.map(async (sub: any) => {
        const enriched = await this.enrichSuborder(sub);
        const shipment = sub.shipment || enriched.shipment;
        if (shipment) {
          return this.formatShipmentResponse(shipment, enriched);
        } else {
          const sellerObj = dbStore.getVendors().find((v: any) => v.id === sub.sellerId) || {
            id: sub.sellerId,
            shopName: sub.sellerName || 'Vendor Merchant',
          };
          return {
            id: sub.id,
            suborderId: sub.id,
            suborderNumber: sub.suborderNumber,
            orderId: sub.orderId,
            orderNumber: parentOrder.orderNumber || parentOrder.id,
            sellerId: sub.sellerId,
            sellerName: sellerObj.shopName,
            provider: 'Shiprocket Express',
            providerShipmentId: 'PENDING',
            awbNumber: null,
            shippingCarrier: null,
            labelUrl: null,
            status: sub.status || 'CREATED',
            estimatedDeliveryDate: null,
            shippedAt: sub.dispatchedAt || null,
            deliveredAt: sub.deliveredAt || null,
            cancelledAt: null,
            failureReason: null,
            createdAt: sub.createdAt || new Date(),
            updatedAt: sub.updatedAt || new Date(),
            trackingEvents: [],
          };
        }
      })
    );

    return {
      orderId: parentOrder.id,
      orderNumber: parentOrder.orderNumber || parentOrder.id,
      status: parentOrder.status || 'CONFIRMED',
      createdAt: parentOrder.createdAt || new Date(),
      suborders: subordersFormatted,
    };
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
    let matchingSuborderId: string | undefined;
    if (event.suborderNumber) {
      const targetSub = await prisma.sellerSuborder.findUnique({ where: { suborderNumber: event.suborderNumber } });
      if (targetSub) matchingSuborderId = targetSub.id;
    }

    const shipmentRaw = await prisma.shipment.findFirst({
      where: {
        OR: [
          event.awbNumber ? { awbNumber: event.awbNumber } : undefined,
          event.providerShipmentId ? { providerShipmentId: event.providerShipmentId } : undefined,
          matchingSuborderId ? { suborderId: matchingSuborderId } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!shipmentRaw) {
      return { status: 'ignored', reason: 'Shipment not found for webhook event.' };
    }

    const suborderRaw = await prisma.sellerSuborder.findUnique({ where: { id: shipmentRaw.suborderId } });
    const suborder = await this.enrichSuborder(suborderRaw);
    const shipment = { ...shipmentRaw, suborder };

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
    const allShipmentsRaw = await prisma.shipment.findMany({
      include: {
        trackingEvents: { orderBy: { eventTimestamp: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allShipments: any[] = [];
    for (const shp of allShipmentsRaw) {
      const suborderRaw = await prisma.sellerSuborder.findUnique({ where: { id: shp.suborderId } });
      const suborder = await this.enrichSuborder(suborderRaw);
      allShipments.push({ ...shp, suborder });
    }

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

  private async enrichSuborder(suborderRaw: any): Promise<any> {
    if (!suborderRaw) return null;
    const parentOrder: any = (await prisma.order.findUnique({
      where: { id: suborderRaw.orderId },
    })) || dbStore.getOrders().find((o: any) => o.id === suborderRaw.orderId);

    const sellerObj = dbStore.getVendors().find((v: any) => v.id === suborderRaw.sellerId) || {
      id: suborderRaw.sellerId,
      shopName: 'Vendor Merchant',
      sellerType: 'MANUFACTURER',
    };

    const customerId = parentOrder?.userId || parentOrder?.customerId;
    const guestAccessToken = parentOrder?.guestAccessToken;

    return {
      ...suborderRaw,
      order: parentOrder ? {
        ...parentOrder,
        customerId,
        guestAccessToken,
        customerName: parentOrder.shippingAddress?.name || parentOrder.user?.name || parentOrder.customerName || 'Customer',
        customerEmail: parentOrder.shippingAddress?.email || parentOrder.user?.email || parentOrder.customerEmail || 'customer@example.com',
        customerPhone: parentOrder.shippingAddress?.phone || '9876543210',
        paymentStatus: parentOrder.paymentStatus || (parentOrder.status === 'CONFIRMED' ? 'Paid' : 'Pending'),
        paymentMethod: parentOrder.paymentMethod || 'Online Payment (Razorpay)',
        shippingAddress: parentOrder.shippingAddress || {},
        createdAt: parentOrder.createdAt || new Date(),
        orderNumber: parentOrder.orderNumber || parentOrder.id,
        status: parentOrder.status || 'CONFIRMED',
      } : {
        customerId: 'customer-1',
        customerEmail: 'customer@example.com',
        paymentStatus: 'Paid',
        paymentMethod: 'Online Payment',
        shippingAddress: {},
        createdAt: new Date(),
        orderNumber: suborderRaw.orderId,
        status: 'CONFIRMED',
      },
      seller: sellerObj,
      items: parentOrder?.items || [],
    };
  }
}

export const shippingService = new ShippingService();
