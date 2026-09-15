import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { authenticate, requireAuth } from '../middleware/auth';
import { getCandidateSellerIds } from '../services/serviceabilityService';

const router = Router();

// Indian 6-digit pincode validator regex
const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

function resolveSellerId(req: Request): string {
  const explicit = req.query.sellerId || req.body.sellerId || req.headers['x-vendor-id'];
  if (explicit) {
    return String(explicit).trim();
  }
  return req.user?.vendorId || req.user?.userId || 'vendor-1';
}

/**
 * GET /api/vendors/delivery-pincodes
 * Fetch serviceable pincodes for authenticated vendor/seller
 */
router.get('/', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const sellerId = resolveSellerId(req);
    const candidateIds = await getCandidateSellerIds(sellerId);
    const pincodes = await prisma.sellerDeliveryPincode.findMany({
      where: { sellerId: { in: candidateIds } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, sellerId, pincodes });
  } catch (error: any) {
    console.error('[Vendor Delivery Pincodes] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor delivery pincodes.' });
  }
});

/**
 * POST /api/vendors/delivery-pincodes
 * Add a new serviceable delivery pincode
 */
router.post('/', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const sellerId = resolveSellerId(req);
    const { pincode, isActive } = req.body;

    const cleanPincode = String(pincode || '').trim();
    if (!cleanPincode || !INDIAN_PINCODE_REGEX.test(cleanPincode)) {
      return res.status(400).json({
        error: 'INVALID_PINCODE',
        message: 'A valid 6-digit Indian PIN code (e.g. 400001) is required.',
      });
    }

    const candidateIds = await getCandidateSellerIds(sellerId);
    let primaryRecord: any = null;

    for (const cid of candidateIds) {
      const record = await prisma.sellerDeliveryPincode.upsert({
        where: {
          sellerId_pincode: {
            sellerId: cid,
            pincode: cleanPincode,
          },
        },
        update: {
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
        create: {
          sellerId: cid,
          pincode: cleanPincode,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });
      if (!primaryRecord || cid === sellerId) {
        primaryRecord = record;
      }
    }

    res.status(201).json({
      success: true,
      message: `Pincode ${cleanPincode} added to delivery coverage for seller ${sellerId}`,
      pincode: primaryRecord,
    });
  } catch (error: any) {
    console.error('[Vendor Delivery Pincodes] Add error:', error);
    res.status(500).json({ error: 'Failed to add delivery pincode.', message: error.message });
  }
});

/**
 * POST /api/vendors/delivery-pincodes/bulk
 * Bulk add multiple pincodes
 */
router.post('/bulk', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const sellerId = resolveSellerId(req);
    const { pincodes } = req.body;

    if (!Array.isArray(pincodes) || pincodes.length === 0) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'An array of pincodes is required.' });
    }

    const validPincodes = pincodes
      .map((p) => String(p).trim())
      .filter((p) => INDIAN_PINCODE_REGEX.test(p));

    if (validPincodes.length === 0) {
      return res.status(400).json({ error: 'INVALID_PINCODES', message: 'No valid 6-digit Indian PIN codes found.' });
    }

    const candidateIds = await getCandidateSellerIds(sellerId);
    const results = [];

    for (const pin of validPincodes) {
      for (const cid of candidateIds) {
        const rec = await prisma.sellerDeliveryPincode.upsert({
          where: { sellerId_pincode: { sellerId: cid, pincode: pin } },
          update: { isActive: true },
          create: { sellerId: cid, pincode: pin, isActive: true },
        });
        if (cid === sellerId) {
          results.push(rec);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Added ${results.length} delivery pincodes for seller ${sellerId}`,
      pincodes: results,
    });
  } catch (error: any) {
    console.error('[Vendor Delivery Pincodes] Bulk add error:', error);
    res.status(500).json({ error: 'Failed to bulk add delivery pincodes.' });
  }
});

/**
 * PUT /api/vendors/delivery-pincodes/:id
 * Toggle active status or update pincode
 */
router.put('/:id', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.sellerDeliveryPincode.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Delivery pincode record not found.' });
    }

    const { isActive, pincode } = req.body;
    let cleanPincode = existing.pincode;
    if (pincode !== undefined) {
      const pStr = String(pincode).trim();
      if (!INDIAN_PINCODE_REGEX.test(pStr)) {
        return res.status(400).json({ error: 'INVALID_PINCODE', message: 'Valid 6-digit Indian PIN code required.' });
      }
      cleanPincode = pStr;
    }

    const targetActive = isActive !== undefined ? Boolean(isActive) : existing.isActive;
    const candidateIds = await getCandidateSellerIds(existing.sellerId);
    if (req.user?.vendorId) candidateIds.push(req.user.vendorId);
    if (req.user?.userId) candidateIds.push(req.user.userId);

    const updated = await prisma.sellerDeliveryPincode.update({
      where: { id },
      data: {
        pincode: cleanPincode,
        isActive: targetActive,
      },
    });

    await prisma.sellerDeliveryPincode.updateMany({
      where: {
        sellerId: { in: candidateIds },
        pincode: existing.pincode,
      },
      data: {
        pincode: cleanPincode,
        isActive: targetActive,
      },
    });

    res.json({ success: true, message: 'Delivery pincode updated.', pincode: updated });
  } catch (error: any) {
    console.error('[Vendor Delivery Pincodes] Update error:', error);
    res.status(500).json({ error: 'Failed to update delivery pincode.' });
  }
});

/**
 * DELETE /api/vendors/delivery-pincodes/:id
 * Delete a delivery pincode record
 */
router.delete('/:id', authenticate, requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.sellerDeliveryPincode.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Delivery pincode record not found.' });
    }

    const candidateIds = await getCandidateSellerIds(existing.sellerId);
    if (req.user?.vendorId) candidateIds.push(req.user.vendorId);
    if (req.user?.userId) candidateIds.push(req.user.userId);

    await prisma.sellerDeliveryPincode.deleteMany({
      where: {
        sellerId: { in: candidateIds },
        pincode: existing.pincode,
      },
    });

    res.json({ success: true, message: 'Delivery pincode removed successfully.' });
  } catch (error: any) {
    console.error('[Vendor Delivery Pincodes] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete delivery pincode.' });
  }
});

export default router;
