import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';
import { logSecurityEvent } from '../utils/security';
import { evaluateBuyBox, OfferWithRelations } from '../services/buyBoxService';
import { calculateEffectivePrice } from '../utils/pricing';
import { settlementService } from '../services/settlementService';

export const adminMarketplaceRouter = Router();

// Enforce strict Admin RBAC on all routes in this router
adminMarketplaceRouter.use(requireAuth, requireRole('ADMIN'), requireActiveAccount);

// ============================================================================
// 1. SELLER MANAGEMENT & VERIFICATION (Sections 4, 5, 6)
// ============================================================================

/**
 * GET /api/admin/marketplace/vendors
 * Lists all registered vendors with verification, lifecycle status, metrics, and offer counts.
 */
adminMarketplaceRouter.get('/vendors', async (req: Request, res: Response) => {
  try {
    const { status, sellerType, search } = req.query;

    const where: any = {};
    if (status && status !== 'All') {
      where.status = String(status);
    }
    if (sellerType && sellerType !== 'All') {
      where.sellerType = String(sellerType);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { shopName: { contains: q, mode: 'insensitive' } },
        { ownerName: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const vendors = await prisma.vendorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            offers: true,
            suborders: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const formatted = vendors.map((v) => ({
      id: v.id,
      userId: v.userId,
      email: v.user.email,
      shopName: v.shopName,
      ownerName: v.ownerName || 'N/A',
      phone: v.phone || null,
      city: v.city || null,
      address: v.address || null,
      description: v.description || null,
      sellerType: v.sellerType,
      badge: v.badge || null,
      rating: Number(v.rating),
      totalReviews: v.totalReviews,
      orderCompletionRate: Number(v.orderCompletionRate),
      onTimeDispatchRate: Number(v.onTimeDispatchRate),
      status: v.status,
      userStatus: v.user.status,
      joinedAt: v.joinedAt.toISOString(),
      offersCount: v._count.offers,
      subordersCount: v._count.suborders,
    }));

    res.json({ vendors: formatted });
  } catch (error) {
    console.error('Failed to fetch admin vendors list:', error);
    res.status(500).json({ error: 'Failed to fetch vendors list' });
  }
});

/**
 * PATCH /api/admin/marketplace/vendors/:id/status
 * Updates vendor marketplace status (ACTIVE, SUSPENDED, REJECTED, PENDING).
 */
adminMarketplaceRouter.patch('/vendors/:id/status', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, reason } = req.body;

    const validStatuses = ['ACTIVE', 'SUSPENDED', 'REJECTED', 'PENDING', 'APPLICATION_SUBMITTED', 'UNDER_REVIEW'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const existing = await prisma.vendorProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendorProfile.update({
        where: { id },
        data: { status },
      });

      // Synchronize User account status if suspending or activating
      if (status === 'SUSPENDED' || status === 'REJECTED') {
        await tx.user.update({
          where: { id: existing.userId },
          data: { status: 'SUSPENDED' },
        });
      } else if (status === 'ACTIVE') {
        await tx.user.update({
          where: { id: existing.userId },
          data: { status: 'ACTIVE' },
        });
      }

      return vendor;
    });

    // Operational audit event
    const auditEvent =
      status === 'SUSPENDED'
        ? 'SELLER_SUSPENDED'
        : status === 'REJECTED'
        ? 'SELLER_REJECTED'
        : status === 'ACTIVE' && existing.status === 'SUSPENDED'
        ? 'SELLER_REACTIVATED'
        : 'SELLER_APPROVED';

    logSecurityEvent(auditEvent, {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'SUCCESS',
      resourceId: id,
      reason: reason || `Admin updated vendor status to ${status}`,
    });

    res.json({
      success: true,
      message: `Vendor status successfully updated to ${status}`,
      vendor: updated,
    });
  } catch (error) {
    console.error('Failed to update vendor status:', error);
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
});

/**
 * GET /api/admin/marketplace/vendors/:id/performance
 * Calculates authoritative seller performance metrics from PostgreSQL records.
 */
adminMarketplaceRouter.get('/vendors/:id/performance', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        offers: {
          include: { inventory: true },
        },
        suborders: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Suborders breakdown
    const totalOrders = vendor.suborders.length;
    const completedOrders = vendor.suborders.filter((s) => s.status === 'DELIVERED').length;
    const cancelledOrders = vendor.suborders.filter((s) => s.status === 'CANCELLED').length;
    const inProgressOrders = vendor.suborders.filter((s) =>
      ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(s.status)
    ).length;

    // Offers breakdown
    const totalOffers = vendor.offers.length;
    const activeOffers = vendor.offers.filter((o) => o.status === 'ACTIVE' && o.moderationStatus === 'APPROVED').length;
    const outOfStockOffers = vendor.offers.filter((o) => (o.inventory?.availableStock ?? 0) <= 0).length;

    // Buy Box calculation across all MasterProducts this vendor sells
    const masterProductIds = Array.from(new Set(vendor.offers.map((o) => o.masterProductId)));
    let buyBoxParticipation = 0;
    let buyBoxWins = 0;

    if (masterProductIds.length > 0) {
      const masterProducts = await prisma.masterProduct.findMany({
        where: { id: { in: masterProductIds }, status: 'APPROVED' },
        include: {
          offers: {
            where: { status: 'ACTIVE', moderationStatus: 'APPROVED' },
            include: { seller: true, inventory: true },
          },
        },
      });

      for (const mp of masterProducts) {
        const hasEligibleOffer = mp.offers.some((o) => o.sellerId === id);
        if (hasEligibleOffer) {
          buyBoxParticipation++;
          const evalResult = evaluateBuyBox(mp.id, mp.offers as OfferWithRelations[]);
          const winningOffer = mp.offers.find((o) => o.id === evalResult.winnerOfferId);
          if (winningOffer && winningOffer.sellerId === id) {
            buyBoxWins++;
          }
        }
      }
    }

    const winRatePercent = buyBoxParticipation > 0 ? (buyBoxWins / buyBoxParticipation) * 100 : 0;

    res.json({
      vendorId: vendor.id,
      shopName: vendor.shopName,
      sellerType: vendor.sellerType,
      status: vendor.status,
      metrics: {
        rating: Number(vendor.rating),
        totalReviews: vendor.totalReviews,
        orderCompletionRate: Number(vendor.orderCompletionRate),
        onTimeDispatchRate: Number(vendor.onTimeDispatchRate),
        isBuyBoxEligible: Number(vendor.orderCompletionRate) >= 85.0 && (vendor.status === 'ACTIVE' || vendor.status === 'APPROVED'),
      },
      orders: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        inProgressOrders,
        completionPercentage: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '100.0',
      },
      offers: {
        totalOffers,
        activeOffers,
        outOfStockOffers,
      },
      buyBox: {
        participationCatalogCount: buyBoxParticipation,
        winsCount: buyBoxWins,
        winRatePercent: Number(winRatePercent.toFixed(1)),
      },
    });
  } catch (error) {
    console.error('Failed to calculate vendor performance:', error);
    res.status(500).json({ error: 'Failed to calculate vendor performance' });
  }
});

// ============================================================================
// 2. MASTER PRODUCT CATALOG ADMINISTRATION (Sections 7, 8)
// ============================================================================

/**
 * GET /api/admin/marketplace/master-products
 * Lists canonical master products with category, brand, age group, offer counts.
 */
adminMarketplaceRouter.get('/master-products', async (req: Request, res: Response) => {
  try {
    const { search, categoryId, status } = req.query;

    const where: any = {};
    if (status && status !== 'All') {
      where.status = status;
    }
    if (categoryId && categoryId !== 'All') {
      where.categoryId = String(categoryId);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { masterSku: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const masterProducts = await prisma.masterProduct.findMany({
      where,
      include: {
        category: true,
        brand: true,
        ageGroup: true,
        media: { orderBy: { sortOrder: 'asc' } },
        offers: {
          select: {
            id: true,
            status: true,
            moderationStatus: true,
            basePrice: true,
            salePrice: true,
            seller: { select: { id: true, shopName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = masterProducts.map((mp) => {
      const activeOffers = mp.offers.filter((o) => o.status === 'ACTIVE' && o.moderationStatus === 'APPROVED');
      const prices = activeOffers.map((o) => Number(calculateEffectivePrice(o.basePrice, o.salePrice)));
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

      return {
        id: mp.id,
        name: mp.name,
        slug: mp.slug,
        masterSku: mp.masterSku,
        gtin: mp.gtin,
        categoryId: mp.categoryId,
        category: mp.category.name,
        brandId: mp.brandId,
        brand: mp.brand?.name || 'Play Petal',
        ageGroupId: mp.ageGroupId,
        ageGroup: mp.ageGroup?.label || null,
        description: mp.description,
        shortDescription: mp.shortDescription,
        status: mp.status,
        image: mp.media.find((m) => m.isMain)?.url || mp.media[0]?.url || null,
        media: mp.media,
        totalOffersCount: mp.offers.length,
        activeOffersCount: activeOffers.length,
        priceRange: { minPrice, maxPrice },
        createdAt: mp.createdAt.toISOString(),
      };
    });

    res.json({ products: formatted });
  } catch (error) {
    console.error('Failed to fetch master products:', error);
    res.status(500).json({ error: 'Failed to fetch master products' });
  }
});

/**
 * POST /api/admin/marketplace/master-products
 * Creates a new canonical MasterProduct.
 */
adminMarketplaceRouter.post('/master-products', async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug,
      masterSku,
      gtin,
      categoryId,
      brandId,
      ageGroupId,
      shortDescription,
      description,
      specifications,
      features,
      boxContents,
      safetyCertifications,
      images,
      status,
    } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Product name and categoryId are required' });
    }

    const cleanName = String(name).trim();
    const timestamp = Date.now();
    const generatedSlug = (slug || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) + `-${timestamp}`;
    const generatedSku = masterSku ? String(masterSku).trim().toUpperCase() : `MP-TOY-${timestamp}`;

    const created = await prisma.masterProduct.create({
      data: {
        id: `prod-ms-${timestamp}`,
        name: cleanName,
        slug: generatedSlug,
        masterSku: generatedSku,
        gtin: gtin || null,
        categoryId,
        brandId: brandId || null,
        ageGroupId: ageGroupId || null,
        shortDescription: shortDescription || null,
        description: description || null,
        specifications: specifications || null,
        features: features || null,
        boxContents: boxContents || null,
        safetyCertifications: safetyCertifications || null,
        status: status || 'APPROVED',
        media: {
          create: (images || []).map((imgUrl: string, idx: number) => ({
            url: imgUrl,
            sortOrder: idx,
            isMain: idx === 0,
          })),
        },
      },
      include: {
        category: true,
        brand: true,
        media: true,
      },
    });

    logSecurityEvent('MASTER_PRODUCT_CREATED', {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      resourceId: created.id,
      reason: `Admin created canonical MasterProduct "${cleanName}" (${created.masterSku})`,
    });

    res.status(201).json({
      success: true,
      message: 'MasterProduct created successfully',
      masterProduct: created,
      product: created,
    });
  } catch (error: any) {
    console.error('Failed to create MasterProduct:', error);
    res.status(500).json({ error: 'Failed to create MasterProduct', message: error.message });
  }
});

/**
 * PUT /api/admin/marketplace/master-products/:id
 * Updates canonical MasterProduct specifications, description, and taxonomy.
 */
adminMarketplaceRouter.put('/master-products/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const {
      name,
      gtin,
      categoryId,
      brandId,
      ageGroupId,
      shortDescription,
      description,
      specifications,
      features,
      boxContents,
      safetyCertifications,
      status,
    } = req.body;

    const existing = await prisma.masterProduct.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Master product not found' });
    }

    const updated = await prisma.masterProduct.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        gtin: gtin !== undefined ? gtin : undefined,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        brandId: brandId !== undefined ? brandId : undefined,
        ageGroupId: ageGroupId !== undefined ? ageGroupId : undefined,
        shortDescription: shortDescription !== undefined ? shortDescription : undefined,
        description: description !== undefined ? description : undefined,
        specifications: specifications !== undefined ? specifications : undefined,
        features: features !== undefined ? features : undefined,
        boxContents: boxContents !== undefined ? boxContents : undefined,
        safetyCertifications: safetyCertifications !== undefined ? safetyCertifications : undefined,
        status: status !== undefined ? status : undefined,
      },
      include: {
        category: true,
        brand: true,
      },
    });

    logSecurityEvent('MASTER_PRODUCT_UPDATED', {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      resourceId: id,
      reason: `Admin updated canonical MasterProduct details for "${updated.name}"`,
    });

    res.json({
      success: true,
      message: 'MasterProduct updated successfully',
      masterProduct: updated,
      product: updated,
    });
  } catch (error) {
    console.error('Failed to update MasterProduct:', error);
    res.status(500).json({ error: 'Failed to update MasterProduct' });
  }
});

/**
 * PATCH /api/admin/marketplace/master-products/:id/status
 * Moderates MasterProduct lifecycle status (APPROVED, UNDER_REVIEW, REJECTED, ARCHIVED).
 */
adminMarketplaceRouter.patch('/master-products/:id/status', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, reason } = req.body;

    const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = await prisma.masterProduct.update({
      where: { id },
      data: { status },
    });

    const auditEvent = status === 'APPROVED' ? 'MASTER_PRODUCT_APPROVED' : 'MASTER_PRODUCT_REJECTED';
    logSecurityEvent(auditEvent, {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      resourceId: id,
      reason: reason || `Admin set status to ${status}`,
    });

    res.json({
      success: true,
      message: `MasterProduct status updated to ${status}`,
      masterProduct: updated,
      product: updated,
    });
  } catch (error) {
    console.error('Failed to update MasterProduct status:', error);
    res.status(500).json({ error: 'Failed to update MasterProduct status' });
  }
});

// ============================================================================
// 3. SELLER OFFER MODERATION & PRICE ANOMALIES (Sections 9, 10, 11)
// ============================================================================

/**
 * GET /api/admin/marketplace/offers
 * Lists all commercial offers with price anomaly flags, seller trust, and moderation status.
 */
adminMarketplaceRouter.get('/offers', async (req: Request, res: Response) => {
  try {
    const { status, moderationStatus, sellerId, masterProductId, hasAnomalies } = req.query;

    const where: any = {};
    if (status && status !== 'All') where.status = status;
    if (moderationStatus && moderationStatus !== 'All') where.moderationStatus = moderationStatus;
    if (sellerId) where.sellerId = String(sellerId);
    if (masterProductId) where.masterProductId = String(masterProductId);

    const offers = await prisma.sellerOffer.findMany({
      where,
      include: {
        masterProduct: {
          select: { id: true, name: true, masterSku: true },
        },
        seller: {
          select: {
            id: true,
            shopName: true,
            sellerType: true,
            status: true,
            rating: true,
            orderCompletionRate: true,
            onTimeDispatchRate: true,
          },
        },
        inventory: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = offers.map((o) => {
      const base = Number(o.basePrice);
      const sale = o.salePrice !== null ? Number(o.salePrice) : null;
      const effective = Number(calculateEffectivePrice(o.basePrice, o.salePrice));
      const availStock = o.inventory?.availableStock ?? 0;
      const physStock = o.inventory?.physicalStock ?? 0;
      const resStock = o.inventory?.reservedStock ?? 0;

      // Price & Quality Anomaly Detection
      const invalidBasePrice = base <= 0;
      const invalidSalePrice = sale !== null && (sale >= base || sale <= 0);
      const largeDiscount = sale !== null && (base - sale) / base >= 0.7; // >= 70% discount
      const outOfStock = availStock <= 0;
      const sellerInactive = o.seller.status !== 'ACTIVE' && o.seller.status !== 'APPROVED';
      const lowSellerCompletion = Number(o.seller.orderCompletionRate) < 85.0;
      const slowDelivery = o.estimatedDeliveryDays > 7;

      const anomalies: string[] = [];
      if (invalidBasePrice) anomalies.push('Base price <= ₹0');
      if (invalidSalePrice) anomalies.push('Sale price >= Base price or <= 0');
      if (largeDiscount) anomalies.push(`Unusually steep discount (${Math.round(((base - (sale || 0)) / base) * 100)}%)`);
      if (outOfStock) anomalies.push('Zero available stock');
      if (sellerInactive) anomalies.push(`Seller is ${o.seller.status}`);
      if (lowSellerCompletion) anomalies.push(`Seller completion rate below 85% (${o.seller.orderCompletionRate}%)`);
      if (slowDelivery) anomalies.push(`Slow delivery SLA (${o.estimatedDeliveryDays} days)`);

      return {
        id: o.id,
        masterProductId: o.masterProductId,
        productName: o.masterProduct.name,
        masterSku: o.masterProduct.masterSku,
        sellerId: o.sellerId,
        sellerName: o.seller.shopName,
        sellerType: o.seller.sellerType,
        sellerStatus: o.seller.status,
        sellerRating: Number(o.seller.rating),
        sellerCompletionRate: Number(o.seller.orderCompletionRate),
        sellerSku: o.sellerSku,
        condition: o.condition,
        basePrice: base,
        salePrice: sale,
        effectivePrice: effective,
        warrantyType: o.warrantyType,
        warrantyMonths: o.warrantyMonths,
        fulfillmentType: o.fulfillmentType,
        estimatedDeliveryDays: o.estimatedDeliveryDays,
        status: o.status,
        moderationStatus: o.moderationStatus,
        rejectionReason: o.rejectionReason,
        physicalStock: physStock,
        reservedStock: resStock,
        availableStock: availStock,
        anomalies,
        hasAnomalies: anomalies.length > 0,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      };
    });

    if (hasAnomalies === 'true') {
      return res.json({ offers: formatted.filter((o) => o.hasAnomalies) });
    }

    res.json({ offers: formatted });
  } catch (error) {
    console.error('Failed to fetch admin offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

/**
 * PATCH /api/admin/marketplace/offers/:id/moderation
 * Moderates offer status (APPROVED, PENDING_REVIEW, CHANGES_REQUESTED, REJECTED).
 */
adminMarketplaceRouter.patch('/offers/:id/moderation', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { moderationStatus, rejectionReason } = req.body;

    const valid = ['APPROVED', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED'];
    if (!moderationStatus || !valid.includes(moderationStatus)) {
      return res.status(400).json({ error: `moderationStatus must be one of: ${valid.join(', ')}` });
    }

    const updated = await prisma.sellerOffer.update({
      where: { id },
      data: {
        moderationStatus,
        rejectionReason: moderationStatus === 'REJECTED' || moderationStatus === 'CHANGES_REQUESTED' ? rejectionReason : null,
      },
    });

    const auditEvent = moderationStatus === 'APPROVED' ? 'OFFER_APPROVED' : 'OFFER_REJECTED';
    logSecurityEvent(auditEvent, {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      resourceId: id,
      reason: rejectionReason || `Admin set moderation status to ${moderationStatus}`,
    });

    res.json({
      success: true,
      message: `Offer moderation status updated to ${moderationStatus}`,
      offer: updated,
    });
  } catch (error) {
    console.error('Failed to moderate offer:', error);
    res.status(500).json({ error: 'Failed to moderate offer' });
  }
});

/**
 * PATCH /api/admin/marketplace/offers/:id/status
 * Administrative override for offer status (ACTIVE, PAUSED, SUSPENDED).
 */
adminMarketplaceRouter.patch('/offers/:id/status', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, reason } = req.body;

    const valid = ['ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'SUSPENDED'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    }

    const updated = await prisma.sellerOffer.update({
      where: { id },
      data: { status },
    });

    const auditEvent = status === 'SUSPENDED' ? 'OFFER_SUSPENDED' : status === 'PAUSED' ? 'OFFER_PAUSED' : 'OFFER_REACTIVATED';
    logSecurityEvent(auditEvent, {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      resourceId: id,
      reason: reason || `Admin updated offer status to ${status}`,
    });

    res.json({
      success: true,
      message: `Offer status updated to ${status}`,
      offer: updated,
    });
  } catch (error) {
    console.error('Failed to update offer status:', error);
    res.status(500).json({ error: 'Failed to update offer status' });
  }
});

// ============================================================================
// 4. MULTI-SELLER INVENTORY OPERATIONS & INVARIANTS (Sections 12, 13)
// ============================================================================

/**
 * GET /api/admin/marketplace/inventory
 * Inspects all multi-seller OfferInventory records with stock health states and reservation holds.
 */
adminMarketplaceRouter.get('/inventory', async (req: Request, res: Response) => {
  try {
    const { healthStatus, sellerId, search } = req.query;

    const where: any = {};
    if (sellerId && sellerId !== 'All') {
      where.offer = { sellerId: String(sellerId) };
    }

    const inventories = await prisma.offerInventory.findMany({
      where,
      include: {
        offer: {
          include: {
            masterProduct: { select: { id: true, name: true, masterSku: true } },
            seller: { select: { id: true, shopName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = inventories.map((inv) => {
      let health = 'HEALTHY';
      if (inv.availableStock <= 0) {
        health = 'OUT_OF_STOCK';
      } else if (inv.availableStock <= inv.reorderPoint) {
        health = 'LOW_STOCK';
      }

      const hasReservations = inv.reservedStock > 0;

      return {
        id: inv.id,
        offerId: inv.offerId,
        sellerId: inv.offer.sellerId,
        sellerName: inv.offer.seller.shopName,
        masterProductId: inv.offer.masterProductId,
        productName: inv.offer.masterProduct.name,
        masterSku: inv.offer.masterProduct.masterSku,
        sellerSku: inv.offer.sellerSku,
        physicalStock: inv.physicalStock,
        reservedStock: inv.reservedStock,
        availableStock: inv.availableStock,
        reorderPoint: inv.reorderPoint,
        warehouseName: inv.warehouseName,
        warehouseCity: inv.warehouseCity || 'Primary Hub',
        healthStatus: health,
        hasReservations,
        offerStatus: inv.offer.status,
        updatedAt: inv.updatedAt.toISOString(),
      };
    });

    let filtered = formatted;
    if (healthStatus && healthStatus !== 'All') {
      if (healthStatus === 'RESERVED') {
        filtered = filtered.filter((i) => i.hasReservations);
      } else {
        filtered = filtered.filter((i) => i.healthStatus === healthStatus);
      }
    }

    if (search) {
      const q = String(search).toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          i.sellerName.toLowerCase().includes(q) ||
          i.sellerSku.toLowerCase().includes(q) ||
          i.masterSku.toLowerCase().includes(q)
      );
    }

    res.json({ inventory: filtered });
  } catch (error) {
    console.error('Failed to fetch admin inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * PATCH /api/admin/marketplace/inventory/:offerId/adjust
 * Administratively adjusts physical stock while strictly enforcing mathematical invariants:
 * 1. physicalStock >= 0
 * 2. reservedStock >= 0
 * 3. reservedStock <= physicalStock (Cannot adjust physical stock below active reserved holds!)
 * 4. availableStock = physicalStock - reservedStock >= 0
 */
adminMarketplaceRouter.patch('/inventory/:offerId/adjust', async (req: Request, res: Response) => {
  try {
    const offerId = String(req.params.offerId);
    const { physicalStock, reason } = req.body;

    if (physicalStock === undefined || typeof physicalStock !== 'number' || isNaN(physicalStock)) {
      return res.status(400).json({
        error: 'INVALID_QUANTITY',
        message: 'physicalStock must be a valid integer number',
      });
    }

    const newPhysical = Math.floor(physicalStock);
    if (newPhysical < 0) {
      return res.status(400).json({
        error: 'NEGATIVE_STOCK',
        message: 'Physical stock quantity cannot be negative',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.offerInventory.findUnique({
        where: { offerId },
        include: {
          offer: {
            include: {
              masterProduct: { select: { name: true } },
              seller: { select: { shopName: true } },
            },
          },
        },
      });

      if (!existing) {
        throw new Error('NOT_FOUND: Offer inventory record not found');
      }

      // INVARIANT CHECK: Cannot reduce physicalStock below currently active customer reservedStock
      if (newPhysical < existing.reservedStock) {
        throw new Error(
          `INVARIANT_VIOLATION: Cannot reduce physical stock (${newPhysical}) below active customer reserved holds (${existing.reservedStock}). Physical stock cannot be less than reserved holds. Active customer holds must complete or expire first.`
        );
      }

      const newAvailable = newPhysical - existing.reservedStock;

      const updated = await tx.offerInventory.update({
        where: { offerId },
        data: {
          physicalStock: newPhysical,
          availableStock: newAvailable,
        },
      });

      // Update offer status to OUT_OF_STOCK if available becomes 0, or ACTIVE if previously OUT_OF_STOCK
      if (newAvailable === 0 && existing.offer.status === 'ACTIVE') {
        await tx.sellerOffer.update({
          where: { id: offerId },
          data: { status: 'OUT_OF_STOCK' },
        });
      } else if (newAvailable > 0 && existing.offer.status === 'OUT_OF_STOCK') {
        await tx.sellerOffer.update({
          where: { id: offerId },
          data: { status: 'ACTIVE' },
        });
      }

      return { updated, existing, newAvailable };
    });

    logSecurityEvent('INVENTORY_ADJUSTED', {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      resourceId: offerId,
      reason: `Admin adjusted stock: ${result.existing.physicalStock} -> ${newPhysical} (Reserved: ${result.existing.reservedStock}, Avail: ${result.newAvailable}). Note: ${reason || 'Operational adjustment'}`,
    });

    res.json({
      success: true,
      message: 'Inventory successfully adjusted with mathematical invariants preserved',
      inventory: result.updated,
    });
  } catch (error: any) {
    if (error.message && error.message.startsWith('INVARIANT_VIOLATION')) {
      return res.status(400).json({ error: 'INVARIANT_VIOLATION', message: error.message });
    }
    if (error.message && error.message.startsWith('NOT_FOUND')) {
      return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
    }
    console.error('Failed to adjust inventory:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

// ============================================================================
// 5. SUBORDER OPERATIONS & EXCEPTION MONITORING (Sections 14, 15)
// ============================================================================

/**
 * GET /api/admin/marketplace/suborders
 * Lists all discrete SellerSuborders across vendors with carrier and tracking.
 */
adminMarketplaceRouter.get('/suborders', async (req: Request, res: Response) => {
  try {
    const { status, sellerId, search } = req.query;

    const where: any = {};
    if (status && status !== 'All') where.status = status;
    if (sellerId && sellerId !== 'All') where.sellerId = String(sellerId);

    const suborders = await prisma.sellerSuborder.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            shippingAddress: true,
            createdAt: true,
          },
        },
        seller: {
          select: {
            id: true,
            shopName: true,
            sellerType: true,
          },
        },
        items: true,
        shipment: {
          include: { trackingEvents: { orderBy: { eventTimestamp: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = suborders.map((s) => ({
      id: s.id,
      suborderNumber: s.suborderNumber,
      orderId: s.orderId,
      orderNumber: s.order.orderNumber,
      customerName: s.order.customerName,
      customerEmail: s.order.customerEmail,
      sellerId: s.sellerId,
      sellerName: s.seller.shopName,
      sellerType: s.sellerType,
      subtotal: Number(s.subtotal),
      deliveryFee: Number(s.deliveryFee),
      totalAmount: Number(s.totalAmount),
      status: s.status,
      shippingCarrier: s.shippingCarrier,
      trackingNumber: s.trackingNumber,
      dispatchedAt: s.dispatchedAt ? s.dispatchedAt.toISOString() : null,
      deliveredAt: s.deliveredAt ? s.deliveredAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      shipment: s.shipment ? {
        id: s.shipment.id,
        provider: s.shipment.provider,
        providerShipmentId: s.shipment.providerShipmentId,
        awbNumber: s.shipment.awbNumber,
        shippingCarrier: s.shipment.shippingCarrier,
        labelUrl: s.shipment.labelUrl,
        status: s.shipment.status,
        shippedAt: s.shipment.shippedAt ? s.shipment.shippedAt.toISOString() : null,
        deliveredAt: s.shipment.deliveredAt ? s.shipment.deliveredAt.toISOString() : null,
        trackingEvents: s.shipment.trackingEvents || [],
      } : null,
      itemCount: s.items.length,
      items: s.items.map((it) => ({
        id: it.id,
        name: it.productNameSnapshot || it.name,
        price: Number(it.unitPriceSnapshot || it.price),
        quantity: it.quantity,
        sku: it.sellerSkuSnapshot || it.sku,
      })),
    }));

    res.json({ suborders: formatted });
  } catch (error) {
    console.error('Failed to fetch suborders:', error);
    res.status(500).json({ error: 'Failed to fetch suborders' });
  }
});

/**
 * GET /api/admin/marketplace/order-exceptions
 * Monitors operational exceptions: stuck orders, cancelled suborders, expired reservations, inventory mismatches.
 */
adminMarketplaceRouter.get('/order-exceptions', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    // 1. Stuck in CONFIRMED for > 48 hours without being processed
    const stuckConfirmed = await prisma.sellerSuborder.findMany({
      where: {
        status: 'CONFIRMED',
        createdAt: { lte: fortyEightHoursAgo },
      },
      include: {
        order: { select: { orderNumber: true, customerName: true } },
        seller: { select: { shopName: true } },
      },
      take: 20,
    });

    // 2. Stuck in PROCESSING for > 72 hours without dispatch
    const stuckProcessing = await prisma.sellerSuborder.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lte: seventyTwoHoursAgo },
      },
      include: {
        order: { select: { orderNumber: true, customerName: true } },
        seller: { select: { shopName: true } },
      },
      take: 20,
    });

    // 3. Cancelled suborders
    const cancelledSuborders = await prisma.sellerSuborder.findMany({
      where: { status: 'CANCELLED' },
      include: {
        order: { select: { orderNumber: true, customerName: true } },
        seller: { select: { shopName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    // 4. Expired PENDING inventory reservations needing release
    const expiredReservations = await prisma.inventoryReservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lte: now },
      },
      include: {
        offer: {
          select: {
            id: true,
            sellerSku: true,
            masterProduct: { select: { name: true } },
            seller: { select: { shopName: true } },
          },
        },
      },
      take: 20,
    });

    // 5. Inventory mismatch conditions (availableStock !== physicalStock - reservedStock)
    const allInventories = await prisma.offerInventory.findMany({
      include: {
        offer: {
          select: {
            id: true,
            sellerSku: true,
            masterProduct: { select: { name: true } },
            seller: { select: { shopName: true } },
          },
        },
      },
    });
    const inventoryMismatches = allInventories
      .filter((inv) => inv.availableStock !== Math.max(0, inv.physicalStock - inv.reservedStock))
      .map((inv) => ({
        offerId: inv.offerId,
        productName: inv.offer.masterProduct.name,
        sellerName: inv.offer.seller.shopName,
        physicalStock: inv.physicalStock,
        reservedStock: inv.reservedStock,
        reportedAvailable: inv.availableStock,
        expectedAvailable: Math.max(0, inv.physicalStock - inv.reservedStock),
      }));

    res.json({
      summary: {
        stuckConfirmedCount: stuckConfirmed.length,
        stuckProcessingCount: stuckProcessing.length,
        cancelledSubordersCount: cancelledSuborders.length,
        expiredReservationsCount: expiredReservations.length,
        inventoryMismatchesCount: inventoryMismatches.length,
        totalExceptions:
          stuckConfirmed.length +
          stuckProcessing.length +
          cancelledSuborders.length +
          expiredReservations.length +
          inventoryMismatches.length,
      },
      stuckConfirmed: stuckConfirmed.map((s) => ({
        suborderId: s.id,
        suborderNumber: s.suborderNumber,
        orderNumber: s.order.orderNumber,
        customerName: s.order.customerName,
        sellerName: s.seller.shopName,
        status: s.status,
        ageHours: Math.round((now.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60)),
        createdAt: s.createdAt.toISOString(),
      })),
      stuckProcessing: stuckProcessing.map((s) => ({
        suborderId: s.id,
        suborderNumber: s.suborderNumber,
        orderNumber: s.order.orderNumber,
        customerName: s.order.customerName,
        sellerName: s.seller.shopName,
        status: s.status,
        ageHours: Math.round((now.getTime() - s.updatedAt.getTime()) / (1000 * 60 * 60)),
        updatedAt: s.updatedAt.toISOString(),
      })),
      cancelledSuborders: cancelledSuborders.map((s) => ({
        suborderId: s.id,
        suborderNumber: s.suborderNumber,
        orderNumber: s.order.orderNumber,
        sellerName: s.seller.shopName,
        subtotal: Number(s.subtotal),
        updatedAt: s.updatedAt.toISOString(),
      })),
      expiredReservations: expiredReservations.map((r) => ({
        reservationId: r.id,
        offerId: r.offerId,
        productName: r.offer.masterProduct.name,
        sellerName: r.offer.seller.shopName,
        quantity: r.quantity,
        expiresAt: r.expiresAt.toISOString(),
      })),
      inventoryMismatches,
    });
  } catch (error) {
    console.error('Failed to compute order exceptions:', error);
    res.status(500).json({ error: 'Failed to compute order exceptions' });
  }
});

// ============================================================================
// 6. PRODUCT REVIEWS & SELLER FEEDBACK SEPARATION (Sections 16, 17)
// ============================================================================

/**
 * GET /api/admin/marketplace/reviews/products
 * Lists ProductReviews for canonical toys (distinct from SellerFeedback).
 */
adminMarketplaceRouter.get('/reviews/products', async (req: Request, res: Response) => {
  try {
    const { status, masterProductId } = req.query;

    const where: any = {};
    if (status && status !== 'All') where.status = String(status);
    if (masterProductId) where.masterProductId = String(masterProductId);

    const reviews = await prisma.productReview.findMany({
      where,
      include: {
        masterProduct: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      masterProductId: r.masterProductId,
      productName: r.masterProduct.name,
      customerId: r.customerId,
      customerName: r.customer.name,
      customerEmail: r.customer.email,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      verifiedBuyer: r.verifiedBuyer,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    res.json({ reviews: formatted });
  } catch (error) {
    console.error('Failed to fetch product reviews:', error);
    res.status(500).json({ error: 'Failed to fetch product reviews' });
  }
});

/**
 * PATCH /api/admin/marketplace/reviews/products/:id/status
 * Moderates ProductReview status (Approved, Pending, Rejected, Hidden).
 */
adminMarketplaceRouter.patch('/reviews/products/:id/status', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const valid = ['Approved', 'Pending', 'Rejected', 'Hidden'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    }

    const updated = await prisma.productReview.update({
      where: { id },
      data: { status },
    });

    logSecurityEvent('REVIEW_MODERATED', {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      resourceId: id,
      reason: `Admin updated ProductReview status to ${status}`,
    });

    res.json({
      success: true,
      message: `Product review status updated to ${status}`,
      review: updated,
    });
  } catch (error) {
    console.error('Failed to update product review status:', error);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

/**
 * GET /api/admin/marketplace/reviews/seller-feedback
 * Lists SellerFeedback anchored specifically to SellerSuborders.
 */
adminMarketplaceRouter.get('/reviews/seller-feedback', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.query;

    const where: any = {};
    if (sellerId && sellerId !== 'All') {
      where.suborder = { sellerId: String(sellerId) };
    }

    const feedbacks = await prisma.sellerFeedback.findMany({
      where,
      include: {
        suborder: {
          include: {
            seller: { select: { id: true, shopName: true } },
            order: { select: { id: true, orderNumber: true, customerName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = feedbacks.map((f) => ({
      id: f.id,
      suborderId: f.suborderId,
      suborderNumber: f.suborder.suborderNumber,
      orderNumber: f.suborder.order.orderNumber,
      customerName: f.suborder.order.customerName,
      sellerId: f.suborder.sellerId,
      sellerName: f.suborder.seller.shopName,
      packagingRating: f.packagingRating,
      deliveryRating: f.deliveryRating,
      overallRating: f.overallRating,
      comment: f.comment,
      createdAt: f.createdAt.toISOString(),
    }));

    res.json({ feedbacks: formatted });
  } catch (error) {
    console.error('Failed to fetch seller feedbacks:', error);
    res.status(500).json({ error: 'Failed to fetch seller feedbacks' });
  }
});

/**
 * DELETE /api/admin/marketplace/reviews/seller-feedback/:id
 * Removes inappropriate seller feedback.
 */
adminMarketplaceRouter.delete('/reviews/seller-feedback/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    await prisma.sellerFeedback.delete({
      where: { id },
    });

    logSecurityEvent('FEEDBACK_MODERATED', {
      userId: req.user!.userId,
      email: req.user!.email,
      role: 'ADMIN',
      ip: req.ip,
      status: 'SUCCESS',
      resourceId: id,
      reason: 'Admin deleted inappropriate SellerFeedback record',
    });

    res.json({
      success: true,
      message: 'Seller feedback record deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete seller feedback:', error);
    res.status(500).json({ error: 'Failed to delete seller feedback' });
  }
});

// ============================================================================
// 7. MARKETPLACE OPERATIONAL KPIs (Section 18)
// ============================================================================

/**
 * GET /api/admin/marketplace/kpis
 * Computes authoritative marketplace operational KPIs across sellers, catalog, offers, and Buy Box.
 */
adminMarketplaceRouter.get('/kpis', async (req: Request, res: Response) => {
  try {
    const [
      totalSellers,
      activeSellers,
      pendingSellers,
      suspendedSellers,
      totalMasterProducts,
      activeMasterProducts,
      totalOffers,
      activeOffers,
      pendingOffers,
      outOfStockOffers,
      totalOrders,
      totalSuborders,
    ] = await Promise.all([
      prisma.vendorProfile.count(),
      prisma.vendorProfile.count({ where: { status: 'ACTIVE' } }),
      prisma.vendorProfile.count({ where: { status: { in: ['PENDING', 'APPLICATION_SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.vendorProfile.count({ where: { status: 'SUSPENDED' } }),
      prisma.masterProduct.count(),
      prisma.masterProduct.count({ where: { status: 'APPROVED' } }),
      prisma.sellerOffer.count(),
      prisma.sellerOffer.count({ where: { status: 'ACTIVE', moderationStatus: 'APPROVED' } }),
      prisma.sellerOffer.count({ where: { moderationStatus: 'PENDING_REVIEW' } }),
      prisma.offerInventory.count({ where: { availableStock: { lte: 0 } } }),
      prisma.order.count(),
      prisma.sellerSuborder.count(),
    ]);

    // Calculate Buy Box Coverage across all active MasterProducts
    const activeProducts = await prisma.masterProduct.findMany({
      where: { status: 'APPROVED' },
      include: {
        offers: {
          where: { status: 'ACTIVE', moderationStatus: 'APPROVED' },
          include: { seller: true, inventory: true },
        },
      },
    });

    let coveredCount = 0;
    let firstPartyWins = 0;
    let thirdPartyWins = 0;

    for (const mp of activeProducts) {
      if (mp.offers.length > 0) {
        const evalResult = evaluateBuyBox(mp.id, mp.offers as OfferWithRelations[]);
        if (evalResult.winnerOfferId) {
          coveredCount++;
          const winner = mp.offers.find((o) => o.id === evalResult.winnerOfferId);
          if (winner) {
            if (winner.seller.sellerType === 'FIRST_PARTY') {
              firstPartyWins++;
            } else {
              thirdPartyWins++;
            }
          }
        }
      }
    }

    const buyBoxCoveragePercent =
      activeMasterProducts > 0 ? Number(((coveredCount / activeMasterProducts) * 100).toFixed(1)) : 0;

    res.json({
      sellers: {
        total: totalSellers,
        active: activeSellers,
        pending: pendingSellers,
        suspended: suspendedSellers,
      },
      catalog: {
        totalMasterProducts,
        activeMasterProducts,
      },
      offers: {
        total: totalOffers,
        active: activeOffers,
        pendingModeration: pendingOffers,
        outOfStock: outOfStockOffers,
      },
      orders: {
        totalOrders,
        totalSuborders,
      },
      buyBox: {
        activeCatalogCount: activeMasterProducts,
        coveredCatalogCount: coveredCount,
        coveragePercent: buyBoxCoveragePercent,
        firstPartyWins,
        thirdPartyWins,
      },
    });
  } catch (error) {
    console.error('Failed to compute marketplace KPIs:', error);
    res.status(500).json({ error: 'Failed to compute marketplace KPIs' });
  }
});

// ============================================================================
// 8. PERSISTENT OPERATIONAL AUDIT LOGGING (Sections 19, 20)
// ============================================================================

/**
 * GET /api/admin/marketplace/audit-logs
 * Queries persistent SecurityAuditLog table with event, status, search, and pagination.
 */
adminMarketplaceRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { event, status, search, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (event && event !== 'All') where.event = String(event);
    if (status && status !== 'All') where.status = String(status);
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
        { resourceId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 50));
    const skip = Math.max(0, parseInt(String(offset), 10) || 0);

    const [total, logs] = await Promise.all([
      prisma.securityAuditLog.count({ where }),
      prisma.securityAuditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take,
        skip,
      }),
    ]);

    const sanitized = logs.map((l) => ({
      id: l.id,
      event: l.event,
      status: l.status,
      email: l.email,
      role: l.role,
      ip: l.ip,
      reason: l.reason,
      resourceId: l.resourceId,
      timestamp: l.timestamp.toISOString(),
    }));

    res.json({
      total,
      limit: take,
      offset: skip,
      logs: sanitized,
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ============================================================================
// PHASE 5C: ADMIN SETTLEMENT, PAYOUT & RECONCILIATION OPERATIONS
// ============================================================================

/**
 * GET /api/admin/marketplace/settlements
 * Lists all marketplace settlements with seller, suborder, and lifecycle filtering.
 */
adminMarketplaceRouter.get('/settlements', async (req: Request, res: Response) => {
  try {
    const { sellerId, status, payoutStatus, search, limit, offset } = req.query;
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const skip = Math.max(Number(offset) || 0, 0);

    const where: any = {};
    if (sellerId && sellerId !== 'All') where.sellerId = String(sellerId);
    if (status && status !== 'All') where.status = String(status) as any;
    if (payoutStatus && payoutStatus !== 'All') where.payoutStatus = String(payoutStatus) as any;

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { suborder: { suborderNumber: { contains: q, mode: 'insensitive' } } },
        { seller: { shopName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [settlements, total] = await Promise.all([
      prisma.sellerSettlement.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              shopName: true,
              ownerName: true,
            },
          },
          suborder: {
            select: {
              id: true,
              suborderNumber: true,
              totalAmount: true,
              status: true,
              deliveredAt: true,
            },
          },
        },
        orderBy: { settledAt: 'desc' },
        take,
        skip,
      }),
      prisma.sellerSettlement.count({ where }),
    ]);

    res.json({ settlements, total, limit: take, offset: skip });
  } catch (error: any) {
    console.error('Failed to fetch admin settlements:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch settlements' });
  }
});

/**
 * GET /api/admin/marketplace/settlements/:id
 * Fetches single settlement details with ledger entries and payout links.
 */
adminMarketplaceRouter.get('/settlements/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const settlement = await prisma.sellerSettlement.findUnique({
      where: { id },
      include: {
        seller: true,
        suborder: {
          include: {
            items: true,
            shipment: true,
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
        },
        payoutSettlements: {
          include: {
            payout: true,
          },
        },
      },
    });

    if (!settlement) {
      return res.status(404).json({ error: 'SETTLEMENT_NOT_FOUND', message: 'Settlement not found.' });
    }

    res.json(settlement);
  } catch (error: any) {
    console.error('Failed to fetch settlement detail:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch settlement details' });
  }
});

/**
 * POST /api/admin/marketplace/settlements/create
 * Creates an authoritative settlement for an eligible suborder.
 */
adminMarketplaceRouter.post('/settlements/create', async (req: Request, res: Response) => {
  try {
    const { suborderId } = req.body;
    if (!suborderId) {
      return res.status(400).json({ error: 'suborderId is required' });
    }

    const actor = {
      id: req.user!.userId || req.user!.id,
      role: req.user!.role,
      email: req.user!.email,
    };

    const settlement = await settlementService.createSettlementForSuborder(String(suborderId), actor);
    res.status(201).json({ success: true, settlement });
  } catch (error: any) {
    const isClientError =
      error.message &&
      (error.message.includes('INELIGIBLE_FOR_SETTLEMENT') ||
        error.message.includes('ALREADY_SETTLED') ||
        error.message.includes('SUBORDER_NOT_FOUND') ||
        error.message.includes('PAYMENT_NOT_CAPTURED') ||
        error.message.includes('SUBORDER_NOT_DELIVERED'));

    res.status(isClientError ? 400 : 500).json({
      error: error.message || 'Failed to create settlement',
    });
  }
});

/**
 * GET /api/admin/marketplace/payouts
 * Lists all payouts across vendors with provider and status filters.
 */
adminMarketplaceRouter.get('/payouts', async (req: Request, res: Response) => {
  try {
    const { sellerId, status, limit, offset } = req.query;
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const skip = Math.max(Number(offset) || 0, 0);

    const where: any = {};
    if (sellerId && sellerId !== 'All') where.sellerId = String(sellerId);
    if (status && status !== 'All') where.status = String(status) as any;

    const [payouts, total] = await Promise.all([
      prisma.sellerPayout.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              shopName: true,
              ownerName: true,
            },
          },
          payoutSettlements: {
            include: {
              settlement: {
                select: {
                  id: true,
                  suborderId: true,
                  payableAmount: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.sellerPayout.count({ where }),
    ]);

    res.json({ payouts, total, limit: take, offset: skip });
  } catch (error: any) {
    console.error('Failed to fetch admin payouts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payouts' });
  }
});

/**
 * POST /api/admin/marketplace/payouts/create
 * Initiates payout for a vendor with strict idempotency and row-level reservation locks.
 */
adminMarketplaceRouter.post('/payouts/create', async (req: Request, res: Response) => {
  try {
    const { sellerId, amount, settlementIds, simulateFailure, failureReason } = req.body;
    const idempotencyKey = (req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body.idempotencyKey) as string | undefined;

    if (!sellerId) {
      return res.status(400).json({ error: 'sellerId is required' });
    }
    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is mandatory for payout initiation.',
      });
    }

    const actor = {
      id: req.user!.userId || req.user!.id,
      role: req.user!.role,
      email: req.user!.email,
    };

    const payout = await settlementService.createPayout(
      String(sellerId),
      {
        amount,
        settlementIds,
        idempotencyKey: String(idempotencyKey).trim(),
        simulateFailure: Boolean(simulateFailure),
        failureReason: failureReason ? String(failureReason) : undefined,
      },
      actor
    );

    const isReplay = Boolean((payout as any).isReplay);
    res.status(isReplay ? 200 : 201).json({ success: true, payout });
  } catch (error: any) {
    const isConflict = error.message && error.message.includes('CONCURRENCY_CONFLICT');
    const isClientError =
      error.message &&
      (error.message.includes('NO_UNPAID_SETTLEMENTS') ||
        error.message.includes('INVALID_PAYOUT_AMOUNT') ||
        error.message.includes('IDEMPOTENCY_KEY_REQUIRED'));

    res.status(isConflict ? 409 : isClientError ? 400 : 500).json({
      error: error.message || 'Failed to create payout',
    });
  }
});

/**
 * POST /api/admin/marketplace/payouts/:id/retry
 * Retries a failed payout without creating duplicate SALE_GROSS entries.
 */
adminMarketplaceRouter.post('/payouts/:id/retry', async (req: Request, res: Response) => {
  try {
    const payoutId = String(req.params.id);
    const idempotencyKey = (req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body.idempotencyKey) as string | undefined;

    const actor = {
      id: req.user!.userId || req.user!.id,
      role: req.user!.role,
      email: req.user!.email,
    };

    const payout = await settlementService.retryPayout(
      payoutId,
      { idempotencyKey: idempotencyKey ? String(idempotencyKey).trim() : undefined },
      actor
    );

    res.json({ success: true, payout });
  } catch (error: any) {
    const isClientError =
      error.message &&
      (error.message.includes('PAYOUT_NOT_FOUND') ||
        error.message.includes('CANNOT_RETRY') ||
        error.message.includes('CONCURRENCY_CONFLICT'));

    res.status(isClientError ? 400 : 500).json({
      error: error.message || 'Failed to retry payout',
    });
  }
});

/**
 * GET /api/admin/marketplace/reconciliation/settlements
 * Comprehensive 9-point financial reconciliation report across all vendors.
 */
adminMarketplaceRouter.get('/reconciliation/settlements', async (req: Request, res: Response) => {
  try {
    const report = await settlementService.reconcileAllSellers();
    res.json(report);
  } catch (error: any) {
    console.error('Failed to run settlement reconciliation:', error);
    res.status(500).json({ error: error.message || 'Failed to generate reconciliation report' });
  }
});

/**
 * GET /api/admin/marketplace/vendors/:id/financials
 * Drilldown into a single vendor's financial summary and individual reconciliation.
 */
adminMarketplaceRouter.get('/vendors/:id/financials', async (req: Request, res: Response) => {
  try {
    const vendorId = String(req.params.id);
    const [summary, reconciliation] = await Promise.all([
      settlementService.getSellerFinancialSummary(vendorId),
      settlementService.reconcileSeller(vendorId),
    ]);

    res.json({ summary, reconciliation });
  } catch (error: any) {
    console.error('Failed to fetch vendor financials drilldown:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch vendor financials' });
  }
});

export default adminMarketplaceRouter;
