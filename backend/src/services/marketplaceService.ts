import { Prisma, MasterProduct, ProductModerationStatus } from '@prisma/client';
import { prisma } from '../prisma/client';
import { evaluateBuyBox, BuyBoxResult, OfferWithRelations } from './buyBoxService';
import { calculateEffectivePrice } from '../utils/pricing';

export interface CatalogFilter {
  categoryId?: string;
  category?: string;
  brand?: string;
  ageGroup?: string;
  search?: string;
  vendorId?: string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sortBy?: string;
  status?: string;
  allStatus?: boolean;
}

export interface SanitizedSellerProfile {
  id: string;
  shopName: string;
  slug: string | null;
  sellerType: string;
  rating: number;
  totalReviews: number;
  orderCompletionRate: number;
  onTimeDispatchRate: number;
  badge: string | null;
  city: string | null;
}

export interface SanitizedOffer {
  id: string;
  masterProductId: string;
  sellerId: string;
  sellerSku: string;
  condition: string;
  basePrice: number;
  salePrice: number | null;
  effectivePrice: number;
  warrantyType: string;
  warrantyMonths: number;
  fulfillmentType: string;
  estimatedDeliveryDays: number;
  returnWindowDays: number;
  status: string;
  moderationStatus: string;
  availableStock: number;
  seller: SanitizedSellerProfile;
}

export interface MarketplaceProductResponse {
  // Canonical Master Product Fields
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  categoryId: string;
  category: string;
  brand: string;
  ageGroup: string;
  features: any;
  specifications: any;
  boxContents: any;
  rating: number;
  totalReviews: number;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  status: string;
  image: string;
  images: { id: string; url: string; alt: string | null; isMain: boolean }[];
  createdAt: string;
  updatedAt: string;

  // Authoritative Marketplace Commercial Fields (Derived from Buy Box & Offers)
  featuredOffer: SanitizedOffer | null;
  otherOffers: SanitizedOffer[];
  offersCount: number;
  lowestPrice: number | null;
  highestPrice: number | null;
  buyBoxAudit?: BuyBoxResult | null;

  // Transitional Legacy Compatibility Fields
  price: number;
  basePrice: number;
  salePrice: number | null;
  stock: number;
  vendorId: string;
  vendorName: string;
  vendorRating: number;
}

function sanitizeSeller(seller: any): SanitizedSellerProfile {
  return {
    id: seller.id,
    shopName: seller.shopName,
    slug: seller.slug,
    sellerType: seller.sellerType,
    rating: seller.rating,
    totalReviews: seller.totalReviews,
    orderCompletionRate: seller.orderCompletionRate,
    onTimeDispatchRate: seller.onTimeDispatchRate,
    badge: seller.badge,
    city: seller.city,
  };
}

function formatSanitizedOffer(offer: OfferWithRelations): SanitizedOffer {
  const effective = calculateEffectivePrice(offer.basePrice, offer.salePrice);
  return {
    id: offer.id,
    masterProductId: offer.masterProductId,
    sellerId: offer.sellerId,
    sellerSku: offer.sellerSku,
    condition: offer.condition,
    basePrice: Number(offer.basePrice),
    salePrice: offer.salePrice ? Number(offer.salePrice) : null,
    effectivePrice: Number(effective),
    warrantyType: offer.warrantyType,
    warrantyMonths: offer.warrantyMonths,
    fulfillmentType: offer.fulfillmentType,
    estimatedDeliveryDays: offer.estimatedDeliveryDays,
    returnWindowDays: offer.returnWindowDays,
    status: offer.status,
    moderationStatus: offer.moderationStatus,
    availableStock: offer.inventory?.availableStock ?? 0,
    seller: sanitizeSeller(offer.seller),
  };
}

export class MarketplaceService {
  /**
   * Resolves a MasterProduct with all active competing SellerOffers and evaluates the winning Buy Box.
   */
  async getMasterProductWithOffers(
    idOrSlug: string,
    includeAudit: boolean = true
  ): Promise<MarketplaceProductResponse | null> {
    const masterProduct = await prisma.masterProduct.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: true,
        brand: true,
        ageGroup: true,
        media: { orderBy: { sortOrder: 'asc' } },
        reviews: { where: { status: 'Approved' }, include: { customer: true } },
        offers: {
          include: {
            seller: true,
            inventory: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!masterProduct) {
      return null;
    }

    // Evaluate Buy Box across all offers
    const buyBoxResult = evaluateBuyBox(masterProduct.id, masterProduct.offers as OfferWithRelations[]);
    const winningOfferRaw = masterProduct.offers.find((o) => o.id === buyBoxResult.winnerOfferId);
    const featuredOffer = winningOfferRaw ? formatSanitizedOffer(winningOfferRaw as OfferWithRelations) : null;

    // Separate other competing offers
    const otherOffersRaw = masterProduct.offers.filter(
      (o) => o.id !== buyBoxResult.winnerOfferId && o.status === 'ACTIVE' && o.moderationStatus === 'APPROVED'
    );
    const otherOffers = otherOffersRaw
      .map((o) => formatSanitizedOffer(o as OfferWithRelations))
      .sort((a, b) => a.effectivePrice - b.effectivePrice);

    // Calculate overall price range
    const allEligiblePrices = buyBoxResult.eligibleOffers.map((eo) => Number(eo.effectivePrice));
    const lowestPrice = allEligiblePrices.length > 0 ? Math.min(...allEligiblePrices) : null;
    const highestPrice = allEligiblePrices.length > 0 ? Math.max(...allEligiblePrices) : null;

    const mainMedia = masterProduct.media.find((m) => m.isMain) || masterProduct.media[0];
    const defaultImage = mainMedia?.url || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80';

    return {
      id: masterProduct.id,
      name: masterProduct.name,
      slug: masterProduct.slug,
      sku: masterProduct.masterSku,
      shortDescription: masterProduct.shortDescription,
      description: masterProduct.description,
      categoryId: masterProduct.categoryId,
      category: masterProduct.category.name,
      brand: masterProduct.brand?.name || 'Play Petal',
      ageGroup: masterProduct.ageGroup?.label || '',
      features: masterProduct.features || [],
      specifications: masterProduct.specifications || {},
      boxContents: masterProduct.boxContents || [],
      rating: masterProduct.rating,
      totalReviews: masterProduct.totalReviews,
      isFeatured: masterProduct.isFeatured,
      isNewArrival: masterProduct.isNewArrival,
      isBestSeller: masterProduct.isBestSeller,
      status: masterProduct.status,
      image: defaultImage,
      images: masterProduct.media.map((m) => ({
        id: m.id,
        url: m.url,
        alt: m.alt,
        isMain: m.isMain,
      })),
      createdAt: masterProduct.createdAt.toISOString(),
      updatedAt: masterProduct.updatedAt.toISOString(),

      // Marketplace Fields
      featuredOffer,
      otherOffers,
      offersCount: buyBoxResult.eligibleOffers.length,
      lowestPrice,
      highestPrice,
      buyBoxAudit: includeAudit ? buyBoxResult : null,

      // Transitional Legacy Compatibility Values (derived from featured offer)
      price: featuredOffer ? featuredOffer.effectivePrice : 0,
      basePrice: featuredOffer ? featuredOffer.basePrice : 0,
      salePrice: featuredOffer ? featuredOffer.salePrice : null,
      stock: featuredOffer ? featuredOffer.availableStock : 0,
      vendorId: featuredOffer ? featuredOffer.sellerId : 'seller-playpetal-direct',
      vendorName: featuredOffer ? featuredOffer.seller.shopName : 'Play Petal Direct',
      vendorRating: featuredOffer ? featuredOffer.seller.rating : 5.0,
    };
  }

  /**
   * Queries the canonical MasterProduct catalog with filters and derives pricing/availability from the winning Buy Box.
   */
  async listCatalogProducts(filter: CatalogFilter = {}): Promise<MarketplaceProductResponse[]> {
    const where: Prisma.MasterProductWhereInput = {};

    // Moderation Status
    if (!filter.allStatus) {
      if (filter.status) {
        where.status = filter.status as ProductModerationStatus;
      } else {
        where.status = ProductModerationStatus.APPROVED;
      }
    }

    // Taxonomy Filters
    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    } else if (filter.category) {
      where.category = {
        OR: [
          { slug: { equals: filter.category, mode: 'insensitive' } },
          { name: { equals: filter.category, mode: 'insensitive' } },
        ],
      };
    }

    if (filter.brand) {
      where.brand = {
        OR: [
          { slug: { equals: filter.brand, mode: 'insensitive' } },
          { name: { equals: filter.brand, mode: 'insensitive' } },
        ],
      };
    }

    if (filter.ageGroup) {
      where.ageGroup = {
        label: { contains: filter.ageGroup.replace('years', '').trim(), mode: 'insensitive' },
      };
    }

    // Curated Badges
    if (filter.isFeatured !== undefined) where.isFeatured = filter.isFeatured;
    if (filter.isNewArrival !== undefined) where.isNewArrival = filter.isNewArrival;
    if (filter.isBestSeller !== undefined) where.isBestSeller = filter.isBestSeller;

    // Search Query
    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { masterSku: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Specific Vendor Filter
    if (filter.vendorId) {
      where.offers = {
        some: {
          sellerId: filter.vendorId,
          status: 'ACTIVE',
          moderationStatus: 'APPROVED',
        },
      };
    }

    const masterProducts = await prisma.masterProduct.findMany({
      where,
      include: {
        category: true,
        brand: true,
        ageGroup: true,
        media: { orderBy: { sortOrder: 'asc' } },
        offers: {
          where: { status: 'ACTIVE', moderationStatus: 'APPROVED' },
          include: {
            seller: true,
            inventory: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let results: MarketplaceProductResponse[] = [];

    for (const mp of masterProducts) {
      const buyBoxResult = evaluateBuyBox(mp.id, mp.offers as OfferWithRelations[]);
      const winningOfferRaw = mp.offers.find((o) => o.id === buyBoxResult.winnerOfferId);
      const featuredOffer = winningOfferRaw ? formatSanitizedOffer(winningOfferRaw as OfferWithRelations) : null;

      const otherOffers = mp.offers
        .filter((o) => o.id !== buyBoxResult.winnerOfferId)
        .map((o) => formatSanitizedOffer(o as OfferWithRelations))
        .sort((a, b) => a.effectivePrice - b.effectivePrice);

      const allEligiblePrices = buyBoxResult.eligibleOffers.map((eo) => Number(eo.effectivePrice));
      const lowestPrice = allEligiblePrices.length > 0 ? Math.min(...allEligiblePrices) : null;
      const highestPrice = allEligiblePrices.length > 0 ? Math.max(...allEligiblePrices) : null;

      const mainMedia = mp.media.find((m) => m.isMain) || mp.media[0];
      const defaultImage = mainMedia?.url || 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=500&q=80';

      let responsePrice = featuredOffer ? featuredOffer.effectivePrice : 0;
      let responseBasePrice = featuredOffer ? featuredOffer.basePrice : 0;
      let responseSalePrice = featuredOffer ? featuredOffer.salePrice : null;
      let responseStock = featuredOffer ? featuredOffer.availableStock : 0;
      let responseVendorId = featuredOffer ? featuredOffer.sellerId : 'seller-playpetal-direct';
      let responseVendorName = featuredOffer ? featuredOffer.seller.shopName : 'Play Petal Direct';
      let responseVendorRating = featuredOffer ? featuredOffer.seller.rating : 5.0;

      if (!featuredOffer) {
        const prodFallback = await prisma.product.findUnique({ where: { id: mp.id } });
        if (prodFallback) {
          responseBasePrice = Number(prodFallback.basePrice || prodFallback.price || 999);
          responseSalePrice = prodFallback.salePrice ? Number(prodFallback.salePrice) : null;
          responsePrice = responseSalePrice !== null ? responseSalePrice : responseBasePrice;
          responseStock = prodFallback.stock ?? 20;
          responseVendorId = prodFallback.vendorId || 'vendor-1';
          responseVendorName = prodFallback.vendorName || 'Play Petal Direct';
          responseVendorRating = prodFallback.vendorRating || 5.0;
        }
      }

      const responseItem: MarketplaceProductResponse = {
        id: mp.id,
        name: mp.name,
        slug: mp.slug,
        sku: mp.masterSku,
        shortDescription: mp.shortDescription,
        description: mp.description,
        categoryId: mp.categoryId,
        category: mp.category.name,
        brand: mp.brand?.name || 'Play Petal',
        ageGroup: mp.ageGroup?.label || '',
        features: mp.features || [],
        specifications: mp.specifications || {},
        boxContents: mp.boxContents || [],
        rating: mp.rating,
        totalReviews: mp.totalReviews,
        isFeatured: mp.isFeatured,
        isNewArrival: mp.isNewArrival,
        isBestSeller: mp.isBestSeller,
        status: mp.status,
        image: defaultImage,
        images: mp.media.map((m) => ({
          id: m.id,
          url: m.url,
          alt: m.alt,
          isMain: m.isMain,
        })),
        createdAt: mp.createdAt.toISOString(),
        updatedAt: mp.updatedAt.toISOString(),

        featuredOffer,
        otherOffers,
        offersCount: buyBoxResult.eligibleOffers.length,
        lowestPrice,
        highestPrice,
        buyBoxAudit: null, // Omit detailed audit on catalog listings for performance

        price: responsePrice,
        basePrice: responseBasePrice,
        salePrice: responseSalePrice,
        stock: responseStock,
        vendorId: responseVendorId,
        vendorName: responseVendorName,
        vendorRating: responseVendorRating,
      };

      results.push(responseItem);
    }

    // Post-filtering on derived marketplace metrics
    if (filter.inStock) {
      results = results.filter((p) => p.stock > 0);
    }

    if (filter.minPrice !== undefined) {
      results = results.filter((p) => p.price >= filter.minPrice!);
    }

    if (filter.maxPrice !== undefined) {
      results = results.filter((p) => p.price <= filter.maxPrice!);
    }

    if (filter.onSale) {
      results = results.filter((p) => p.salePrice !== null && p.salePrice < p.basePrice);
    }

    // Sorting
    if (filter.sortBy) {
      switch (filter.sortBy) {
        case 'price_asc':
          results.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          results.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          results.sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
      }
    }

    return results;
  }
}

export const marketplaceService = new MarketplaceService();
