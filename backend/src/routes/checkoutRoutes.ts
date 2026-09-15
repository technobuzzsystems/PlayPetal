import { Router, Request, Response } from 'express';
import { orderService } from '../services/orderService';
import { prisma } from '../prisma/client';

const router = Router();

/**
 * POST /api/checkout/reserve
 * Creates a real inventory reservation hold with row-level locking (FOR UPDATE)
 * and a 15-minute expiration time.
 */
router.post('/reserve', async (req: Request, res: Response) => {
  try {
    const { items, customerId, sessionId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'items array is required with at least one item.',
      });
    }

    // Resolve items (support both offerId and legacy productId adapter)
    const normalizedItems: { offerId: string; quantity: number }[] = [];

    for (const item of items) {
      let offerId = item.offerId;
      const qty = parseInt(item.quantity, 10) || 1;

      if (!offerId && (item.productId || item.id)) {
        const prodId = item.productId || item.id;
        const offer = await prisma.sellerOffer.findFirst({
          where: { masterProductId: prodId, status: 'ACTIVE', moderationStatus: 'APPROVED' },
          include: { inventory: true },
          orderBy: { createdAt: 'asc' },
        });

        if (!offer) {
          return res.status(404).json({
            error: 'OFFER_NOT_FOUND',
            message: `No active commercial offer available for product '${prodId}'.`,
          });
        }
        offerId = offer.id;
      }

      if (!offerId) {
        return res.status(400).json({
          error: 'INVALID_ITEM',
          message: 'Each item must have an offerId or productId.',
        });
      }

      normalizedItems.push({ offerId, quantity: qty });
    }

    const authCustomerId = req.user && req.user.role === 'CUSTOMER' ? req.user.userId : customerId;
    const resolvedSessionId = (req as any).session?.id || sessionId || (req as any).cookies?.pp_session || null;

    const result = await orderService.createReservation(
      normalizedItems,
      authCustomerId,
      resolvedSessionId
    );

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message && error.message.includes('Insufficient stock')) {
      return res.status(409).json({ error: 'INSUFFICIENT_STOCK', message: error.message });
    }
    console.error('Failed to create reservation:', error);
    res.status(500).json({ error: 'Failed to create inventory reservation', message: error.message });
  }
});

/**
 * POST /api/checkout/release-expired
 * Housekeeping trigger to release expired PENDING reservations and restore available inventory.
 */
router.post('/release-expired', async (req: Request, res: Response) => {
  try {
    const result = await orderService.releaseExpiredReservations();
    res.json(result);
  } catch (error: any) {
    console.error('Failed to release expired reservations:', error);
    res.status(500).json({ error: 'Failed to release expired reservations', message: error.message });
  }
});

export default router;
