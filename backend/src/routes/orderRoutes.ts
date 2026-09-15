import { Router, Request, Response } from 'express';
import { dbStore } from '../data/dbStore';
import { prisma } from '../prisma/client';
import { authenticate } from '../middleware/auth';
import { checkCartServiceability } from '../services/serviceabilityService';

const router = Router();

// GET all orders
router.get('/', (req: Request, res: Response) => {
  try {
    const orders = dbStore.getOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST new order (checkout from website)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { items, shippingAddressSnapshot, shippingAddress, addressId } = req.body;

    let targetPincode = '';
    let resolvedSnapshot = shippingAddressSnapshot || null;

    // 1. If addressId is provided, resolve address from PostgreSQL and verify ownership
    if (addressId) {
      if (!req.user) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required to use saved address.' });
      }

      const dbAddress = await prisma.address.findUnique({ where: { id: addressId } });
      if (!dbAddress || dbAddress.userId !== req.user.userId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied: Saved address does not belong to authenticated customer.' });
      }

      targetPincode = dbAddress.pincode;
      resolvedSnapshot = {
        name: dbAddress.name,
        phone: dbAddress.phone,
        email: req.user.email,
        street: dbAddress.street,
        city: dbAddress.city,
        state: dbAddress.state,
        pincode: dbAddress.pincode,
        country: dbAddress.country,
        latitude: dbAddress.latitude,
        longitude: dbAddress.longitude,
        addressId: dbAddress.id,
      };
    } else if (shippingAddressSnapshot && shippingAddressSnapshot.pincode) {
      targetPincode = String(shippingAddressSnapshot.pincode).trim();
    } else if (shippingAddress && typeof shippingAddress === 'string') {
      // Parse 6-digit pincode from shipping string if present
      const match = shippingAddress.match(/\b([1-9][0-9]{5})\b/);
      if (match) targetPincode = match[1];
    }

    // 2. Server-Side Delivery Serviceability Check (PHASE 12 CRITICAL ENFORCEMENT)
    if (targetPincode && Array.isArray(items) && items.length > 0) {
      const serviceability = await checkCartServiceability(targetPincode, items);
      if (!serviceability.isServiceable) {
        return res.status(409).json({
          error: 'DELIVERY_NOT_AVAILABLE',
          code: 'DELIVERY_NOT_AVAILABLE',
          message: 'Service is not available in your area. Please select a different address.',
          unserviceableItems: serviceability.unserviceableItems,
        });
      }
    }

    const payload = {
      ...req.body,
      userId: req.user ? req.user.userId : undefined,
      shippingAddressSnapshot: resolvedSnapshot,
    };

    const order = dbStore.createOrder(payload);

    // Save immutable snapshot to PostgreSQL Order table if authenticated user
    if (req.user && resolvedSnapshot) {
      try {
        await prisma.order.create({
          data: {
            userId: req.user.userId,
            status: 'PENDING',
            totalAmount: payload.totalAmount || order.totalAmount || 0,
            shippingTotal: payload.deliveryFee || 0,
            shippingAddress: resolvedSnapshot,
          },
        });
      } catch (dbErr: any) {
        console.warn('[Order API] Non-fatal PostgreSQL order log error:', dbErr.message);
      }
    }

    res.status(201).json(order);
  } catch (error: any) {
    console.error('[Order API] Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

// PATCH order status (from admin panel / customer sync)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const updated = dbStore.updateOrderStatus(id, status);
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    try {
      const dbStatusMap: Record<string, any> = {
        Pending: 'PENDING',
        Accepted: 'CONFIRMED',
        Processing: 'PROCESSING',
        Shipped: 'SHIPPED',
        Delivered: 'DELIVERED',
        Rejected: 'CANCELLED',
        Cancelled: 'CANCELLED',
      };
      const pgStatus = dbStatusMap[status] || 'PENDING';
      await prisma.order.updateMany({
        where: { id },
        data: { status: pgStatus },
      });
    } catch (pgErr) {
      // Non-fatal DB log sync
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
