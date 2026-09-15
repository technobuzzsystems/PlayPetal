import express, { Request, Response, Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';
import { validateOfferPrices, calculateEffectivePrice } from '../utils/pricing';
import { evaluateBuyBox, OfferWithRelations } from '../services/buyBoxService';

// ============================================================================
// 1. VENDOR OFFER MANAGEMENT ROUTER (Mounted at /api/vendor/offers)
// ============================================================================
export const vendorOfferRouter = Router();

/**
 * GET /api/vendor/offers
 * Lists all commercial offers owned by the authenticated vendor.
 * Server-enforced vendorId from authenticated session.
 */
vendorOfferRouter.get(
  '/',
  requireAuth,
  requireRole('VENDOR'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const vendorId = req.user!.vendorId;
      if (!vendorId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'No vendor profile associated with this account' });
      }

      const offers = await prisma.sellerOffer.findMany({
        where: { sellerId: vendorId },
        include: {
          masterProduct: {
            include: {
              category: true,
              brand: true,
              media: { where: { isMain: true } },
            },
          },
          inventory: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      const formatted = offers.map((o) => {
        const effective = calculateEffectivePrice(o.basePrice, o.salePrice);
        return {
          id: o.id,
          masterProductId: o.masterProductId,
          productName: o.masterProduct.name,
          productSlug: o.masterProduct.slug,
          productImage: o.masterProduct.media[0]?.url || null,
          category: o.masterProduct.category.name,
          brand: o.masterProduct.brand?.name || 'Play Petal',
          sellerSku: o.sellerSku,
          condition: o.condition,
          basePrice: Number(o.basePrice),
          salePrice: o.salePrice ? Number(o.salePrice) : null,
          effectivePrice: Number(effective),
          warrantyType: o.warrantyType,
          warrantyMonths: o.warrantyMonths,
          fulfillmentType: o.fulfillmentType,
          estimatedDeliveryDays: o.estimatedDeliveryDays,
          returnWindowDays: o.returnWindowDays,
          status: o.status,
          moderationStatus: o.moderationStatus,
          rejectionReason: o.rejectionReason,
          stock: o.inventory ? o.inventory.physicalStock : 0,
          availableStock: o.inventory ? o.inventory.availableStock : 0,
          reservedStock: o.inventory ? o.inventory.reservedStock : 0,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        };
      });

      res.json(formatted);
    } catch (error) {
      console.error('Failed to list vendor offers:', error);
      res.status(500).json({ error: 'Failed to list vendor offers' });
    }
  }
);

/**
 * POST /api/vendor/offers
 * Adopts an existing MasterProduct and creates an active commercial offer for the authenticated vendor.
 */
vendorOfferRouter.post(
  '/',
  requireAuth,
  requireRole('VENDOR'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const vendorId = req.user!.vendorId;
      if (!vendorId) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'No vendor profile associated with this account' });
      }

      const {
        masterProductId,
        sellerSku,
        basePrice,
        salePrice,
        condition,
        warrantyType,
        warrantyMonths,
        fulfillmentType,
        estimatedDeliveryDays,
        returnWindowDays,
        stock,
      } = req.body;

      if (!masterProductId) {
        return res.status(400).json({ error: 'masterProductId is required' });
      }

      // 1. Verify MasterProduct exists
      const masterProduct = await prisma.masterProduct.findUnique({
        where: { id: masterProductId },
      });
      if (!masterProduct) {
        return res.status(404).json({ error: 'Master product not found' });
      }

      // 2. Fetch Seller Profile to inspect sellerType
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { id: vendorId },
      });
      if (!vendorProfile) {
        return res.status(404).json({ error: 'Vendor profile not found' });
      }

      // 3. Price Invariant Validation
      const priceValidation = validateOfferPrices(basePrice, salePrice);
      if (!priceValidation.isValid) {
        return res.status(400).json({ error: priceValidation.error });
      }

      const baseDec = new Prisma.Decimal(basePrice.toString());
      const saleDec = salePrice !== undefined && salePrice !== null ? new Prisma.Decimal(salePrice.toString()) : null;

      // 4. Duplicate Offer Check (@@unique([sellerId, masterProductId]))
      const existingOffer = await prisma.sellerOffer.findUnique({
        where: {
          sellerId_masterProductId: {
            sellerId: vendorId,
            masterProductId,
          },
        },
      });
      if (existingOffer) {
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'You already have an active commercial offer for this product. Please update your existing offer instead.',
        });
      }

      // 5. SKU Validation (@@unique([sellerId, sellerSku]))
      const finalSku = sellerSku ? String(sellerSku).trim() : `${masterProduct.masterSku}-${vendorId}`;
      const existingSku = await prisma.sellerOffer.findUnique({
        where: {
          sellerId_sellerSku: {
            sellerId: vendorId,
            sellerSku: finalSku,
          },
        },
      });
      if (existingSku) {
        return res.status(409).json({
          error: 'CONFLICT',
          message: `You already have an offer using SKU '${finalSku}'. Each of your offers must have a unique seller SKU.`,
        });
      }

      // 6. Safe Third-Party Defaults & Flagship Privilege Check
      let resolvedFulfillment = fulfillmentType || 'SELLER_DIRECT';
      let resolvedWarranty = warrantyType || 'SELLER_WARRANTY';

      if (vendorProfile.sellerType !== 'FIRST_PARTY') {
        if (resolvedFulfillment === 'PLAY_PETAL_EXPRESS') {
          return res.status(400).json({
            error: 'INVALID_FULFILLMENT',
            message: 'Play Petal Express fulfillment is reserved for official flagship distribution. Use SELLER_DIRECT.',
          });
        }
        if (resolvedWarranty === 'OFFICIAL_MANUFACTURER_WARRANTY') {
          return res.status(400).json({
            error: 'INVALID_WARRANTY',
            message: 'Official brand manufacturer warranty claims require flagship authorization. Use SELLER_WARRANTY.',
          });
        }
      }

      const physicalStock = stock !== undefined ? Math.max(0, parseInt(stock, 10)) : 10;
      const initialDeliveryDays = estimatedDeliveryDays ? Math.max(1, parseInt(estimatedDeliveryDays, 10)) : 5;
      const initialReturnWindow = returnWindowDays ? Math.max(0, parseInt(returnWindowDays, 10)) : 7;
      const initialWarrantyMonths = warrantyMonths ? Math.max(0, parseInt(warrantyMonths, 10)) : 6;

      // 7. Atomic Creation Transaction
      const created = await prisma.$transaction(async (tx) => {
        const offer = await tx.sellerOffer.create({
          data: {
            masterProductId,
            sellerId: vendorId,
            sellerSku: finalSku,
            condition: condition || 'NEW',
            basePrice: baseDec,
            salePrice: saleDec,
            warrantyType: resolvedWarranty,
            warrantyMonths: initialWarrantyMonths,
            fulfillmentType: resolvedFulfillment,
            estimatedDeliveryDays: initialDeliveryDays,
            returnWindowDays: initialReturnWindow,
            status: 'ACTIVE',
            moderationStatus: 'APPROVED',
          },
        });

        const inventory = await tx.offerInventory.create({
          data: {
            offerId: offer.id,
            physicalStock,
            reservedStock: 0,
            availableStock: physicalStock,
            reorderPoint: 5,
            warehouseName: `${vendorProfile.shopName} Facility`,
            warehouseCity: vendorProfile.city || 'Mumbai',
          },
        });

        return { ...offer, inventory };
      });

      const effective = calculateEffectivePrice(created.basePrice, created.salePrice);

      res.status(201).json({
        id: created.id,
        masterProductId: created.masterProductId,
        sellerId: created.sellerId,
        sellerSku: created.sellerSku,
        condition: created.condition,
        basePrice: Number(created.basePrice),
        salePrice: created.salePrice ? Number(created.salePrice) : null,
        effectivePrice: Number(effective),
        warrantyType: created.warrantyType,
        warrantyMonths: created.warrantyMonths,
        fulfillmentType: created.fulfillmentType,
        estimatedDeliveryDays: created.estimatedDeliveryDays,
        returnWindowDays: created.returnWindowDays,
        status: created.status,
        moderationStatus: created.moderationStatus,
        stock: created.inventory.physicalStock,
        availableStock: created.inventory.availableStock,
        createdAt: created.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Failed to create vendor offer:', error);
      res.status(500).json({ error: 'Failed to create vendor offer' });
    }
  }
);

/**
 * PUT /api/vendor/offers/:id
 * Updates commercial fields (price, stock, warranty, SLA) of an existing offer owned by the vendor.
 */
vendorOfferRouter.put(
  '/:id',
  requireAuth,
  requireRole('VENDOR'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const offerId = String(req.params.id);
      const vendorId = req.user!.vendorId;

      // 1. Verify existence & ownership
      const existing = await prisma.sellerOffer.findUnique({
        where: { id: offerId },
        include: { inventory: true, seller: true },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Offer not found' });
      }

      if (existing.sellerId !== vendorId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied: You do not own this commercial offer.',
        });
      }

      const {
        basePrice,
        salePrice,
        stock,
        estimatedDeliveryDays,
        returnWindowDays,
        warrantyType,
        warrantyMonths,
        status,
      } = req.body;

      // 2. Validate Price if changed
      let newBase = existing.basePrice;
      let newSale = existing.salePrice;

      if (basePrice !== undefined || salePrice !== undefined) {
        const candidateBase = basePrice !== undefined ? basePrice : existing.basePrice;
        const candidateSale = salePrice !== undefined ? salePrice : existing.salePrice;

        const val = validateOfferPrices(candidateBase, candidateSale);
        if (!val.isValid) {
          return res.status(400).json({ error: val.error });
        }

        newBase = new Prisma.Decimal(candidateBase.toString());
        newSale = candidateSale !== null && candidateSale !== undefined ? new Prisma.Decimal(candidateSale.toString()) : null;
      }

      // 3. Validate Warranty if changed
      let newWarranty = existing.warrantyType;
      if (warrantyType !== undefined) {
        if (existing.seller.sellerType !== 'FIRST_PARTY' && warrantyType === 'OFFICIAL_MANUFACTURER_WARRANTY') {
          return res.status(400).json({
            error: 'INVALID_WARRANTY',
            message: 'Official brand manufacturer warranty claims require flagship authorization.',
          });
        }
        newWarranty = warrantyType;
      }

      // 4. Atomic Update
      const updated = await prisma.$transaction(async (tx) => {
        const offer = await tx.sellerOffer.update({
          where: { id: offerId },
          data: {
            basePrice: newBase,
            salePrice: newSale,
            warrantyType: newWarranty,
            warrantyMonths: warrantyMonths !== undefined ? parseInt(warrantyMonths, 10) : undefined,
            estimatedDeliveryDays: estimatedDeliveryDays !== undefined ? parseInt(estimatedDeliveryDays, 10) : undefined,
            returnWindowDays: returnWindowDays !== undefined ? parseInt(returnWindowDays, 10) : undefined,
            status: status !== undefined ? status : undefined,
          },
        });

        let updatedInventory = existing.inventory;
        if (stock !== undefined && existing.inventory) {
          const newPhysical = Math.max(0, parseInt(stock, 10));
          const reserved = existing.inventory.reservedStock;
          const available = Math.max(0, newPhysical - reserved);

          updatedInventory = await tx.offerInventory.update({
            where: { offerId },
            data: {
              physicalStock: newPhysical,
              availableStock: available,
            },
          });
        }

        return { ...offer, inventory: updatedInventory };
      });

      const effective = calculateEffectivePrice(updated.basePrice, updated.salePrice);

      res.json({
        id: updated.id,
        masterProductId: updated.masterProductId,
        sellerId: updated.sellerId,
        sellerSku: updated.sellerSku,
        basePrice: Number(updated.basePrice),
        salePrice: updated.salePrice ? Number(updated.salePrice) : null,
        effectivePrice: Number(effective),
        warrantyType: updated.warrantyType,
        estimatedDeliveryDays: updated.estimatedDeliveryDays,
        status: updated.status,
        stock: updated.inventory?.physicalStock ?? 0,
        availableStock: updated.inventory?.availableStock ?? 0,
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Failed to update vendor offer:', error);
      res.status(500).json({ error: 'Failed to update vendor offer' });
    }
  }
);

/**
 * DELETE /api/vendor/offers/:id
 * Soft-delete / suspend offer (sets status to PAUSED and zero available stock).
 */
vendorOfferRouter.delete(
  '/:id',
  requireAuth,
  requireRole('VENDOR'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const offerId = String(req.params.id);
      const vendorId = req.user!.vendorId;

      const existing = await prisma.sellerOffer.findUnique({
        where: { id: offerId },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Offer not found' });
      }

      if (existing.sellerId !== vendorId) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Access denied: You do not own this commercial offer.',
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.sellerOffer.update({
          where: { id: offerId },
          data: { status: 'PAUSED' },
        });

        await tx.offerInventory.updateMany({
          where: { offerId },
          data: { availableStock: 0 },
        });
      });

      res.json({
        success: true,
        message: 'Offer has been safely paused and removed from storefront catalog discovery.',
      });
    } catch (error) {
      console.error('Failed to pause vendor offer:', error);
      res.status(500).json({ error: 'Failed to pause vendor offer' });
    }
  }
);

// ============================================================================
// 2. ADMIN CATALOG ROUTER (Mounted at /api/admin/catalog)
// ============================================================================
export const adminCatalogRouter = Router();

/**
 * GET /api/admin/catalog/master-products/:id/buy-box-audit
 * Administrator-only diagnostic tool returning real-time Buy Box scoring across all competing sellers.
 */
adminCatalogRouter.get(
  '/master-products/:id/buy-box-audit',
  requireAuth,
  requireRole('ADMIN'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const masterProductId = String(req.params.id);

      const masterProduct = await prisma.masterProduct.findFirst({
        where: { OR: [{ id: masterProductId }, { slug: masterProductId }] },
        include: {
          offers: {
            include: { seller: true, inventory: true },
          },
        },
      });

      if (!masterProduct) {
        return res.status(404).json({ error: 'Master product not found' });
      }

      const buyBoxResult = evaluateBuyBox(masterProduct.id, masterProduct.offers as OfferWithRelations[]);

      res.json({
        masterProductId: masterProduct.id,
        masterProductName: masterProduct.name,
        masterProductSku: masterProduct.masterSku,
        winningOfferId: buyBoxResult.winnerOfferId,
        scoredCandidates: buyBoxResult.eligibleOffers,
        disqualifiedOffers: buyBoxResult.disqualifiedOffers,
        buyBoxResult,
      });
    } catch (error) {
      console.error('Failed to run admin Buy Box audit:', error);
      res.status(500).json({ error: 'Failed to run admin Buy Box audit' });
    }
  }
);

// ============================================================================
// 3. PUBLIC OFFER DISCOVERY ROUTER (Mounted at /api/marketplace/offers)
// ============================================================================
export const marketplaceOfferRouter = Router();

/**
 * GET /api/marketplace/offers/product/:masterProductId
 * Public endpoint to inspect all competing offers for a product.
 */
marketplaceOfferRouter.get('/product/:masterProductId', async (req: Request, res: Response) => {
  try {
    const masterProductId = String(req.params.masterProductId);

    const masterProduct = await prisma.masterProduct.findFirst({
      where: { OR: [{ id: masterProductId }, { slug: masterProductId }] },
      include: {
        offers: {
          where: { status: 'ACTIVE', moderationStatus: 'APPROVED' },
          include: { seller: true, inventory: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!masterProduct) {
      return res.status(404).json({ error: 'Master product not found' });
    }

    const buyBox = evaluateBuyBox(masterProduct.id, masterProduct.offers as OfferWithRelations[]);

    const sanitizedOffers = masterProduct.offers.map((o) => {
      const effective = calculateEffectivePrice(o.basePrice, o.salePrice);
      return {
        id: o.id,
        masterProductId: o.masterProductId,
        sellerId: o.sellerId,
        sellerSku: o.sellerSku,
        condition: o.condition,
        basePrice: Number(o.basePrice),
        salePrice: o.salePrice ? Number(o.salePrice) : null,
        effectivePrice: Number(effective),
        warrantyType: o.warrantyType,
        warrantyMonths: o.warrantyMonths,
        fulfillmentType: o.fulfillmentType,
        estimatedDeliveryDays: o.estimatedDeliveryDays,
        returnWindowDays: o.returnWindowDays,
        availableStock: o.inventory?.availableStock ?? 0,
        seller: {
          id: o.seller.id,
          shopName: o.seller.shopName,
          sellerType: o.seller.sellerType,
          rating: Number(o.seller.rating || 5.0),
        },
      };
    });

    const prices = sanitizedOffers.map((o) => o.effectivePrice);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    res.json({
      masterProductId: masterProduct.id,
      productName: masterProduct.name,
      buyBoxWinnerId: buyBox.winnerOfferId,
      winningOfferId: buyBox.winnerOfferId,
      offers: sanitizedOffers,
      eligibleOffers: buyBox.eligibleOffers,
      disqualifiedCount: buyBox.disqualifiedOffers.length,
      priceRange: {
        minPrice,
        maxPrice,
      },
      calculatedAt: buyBox.calculatedAt,
    });
  } catch (error) {
    console.error('Failed to fetch product offers:', error);
    res.status(500).json({ error: 'Failed to fetch product offers' });
  }
});
