import { prisma } from '../prisma/client';
import { dbStore } from '../data/dbStore';

export interface CartItemInput {
  id: string; // product ID or offer ID
  name?: string;
  vendorId?: string;
  vendorName?: string;
  quantity?: number;
}

export interface ServiceabilityResult {
  isServiceable: boolean;
  pincode: string;
  unserviceableItems: Array<{
    id: string;
    name: string;
    vendorId: string;
    vendorName: string;
  }>;
  message?: string;
}

/**
 * Helper to resolve candidate seller IDs (mapping between DB User IDs, session vendorIds, and dbStore vendorIds).
 */
export async function getCandidateSellerIds(sellerId: string): Promise<string[]> {
  const cleanId = String(sellerId || '').trim();
  const ids = new Set<string>();
  if (cleanId) ids.add(cleanId);
  if (!cleanId) return Array.from(ids);

  try {
    // 1. Check dbStore vendor by ID
    const vendor = dbStore.getVendors().find((v) => v.id === cleanId);
    if (vendor && vendor.email) {
      const u = await prisma.user.findFirst({ where: { email: vendor.email } });
      if (u) ids.add(u.id);
    }

    // 2. Check Prisma User by ID
    const user = await prisma.user.findUnique({ where: { id: cleanId } });
    if (user && user.email) {
      const v = dbStore.getVendors().find((v) => v.email === user.email);
      if (v) ids.add(v.id);
    }
  } catch (err) {
    // Ignore error
  }

  return Array.from(ids);
}

/**
 * Evaluates whether a specific seller has active delivery coverage for a given pincode in PostgreSQL.
 * SellerDeliveryPincode is the ONLY source of truth.
 */
export async function checkSellerServiceability(
  sellerId: string,
  pincode: string
): Promise<boolean> {
  const cleanPincode = String(pincode || '').trim();
  if (!cleanPincode || !/^[1-9][0-9]{5}$/.test(cleanPincode) || !sellerId) {
    return false;
  }

  const candidateIds = await getCandidateSellerIds(sellerId);

  const match = await prisma.sellerDeliveryPincode.findFirst({
    where: {
      sellerId: { in: candidateIds },
      pincode: cleanPincode,
      isActive: true,
    },
  });

  return !!match;
}

/**
 * Returns a Set of sellerIds that are serviceable for the given pincode.
 */
export async function getServiceableSellerIds(
  pincode: string,
  sellerIds: string[]
): Promise<Set<string>> {
  const cleanPincode = String(pincode || '').trim();
  const validIds = sellerIds.map((id) => String(id)).filter(Boolean);
  if (!cleanPincode || !/^[1-9][0-9]{5}$/.test(cleanPincode) || validIds.length === 0) {
    return new Set();
  }

  const candidateMap = new Map<string, string[]>();
  const allCandidatesSet = new Set<string>();

  for (const sid of validIds) {
    const candidates = await getCandidateSellerIds(sid);
    candidateMap.set(sid, candidates);
    candidates.forEach((c) => allCandidateIdsSet.add(c));
  }

  const matches = await prisma.sellerDeliveryPincode.findMany({
    where: {
      sellerId: { in: Array.from(allCandidateIdsSet) },
      pincode: cleanPincode,
      isActive: true,
    },
    select: { sellerId: true },
  });

  const matchedSellerIds = new Set(matches.map((m) => m.sellerId));
  const serviceableInputs = new Set<string>();

  for (const sid of validIds) {
    const candidates = candidateMap.get(sid) || [sid];
    if (candidates.some((c) => matchedSellerIds.has(c))) {
      serviceableInputs.add(sid);
    }
  }

  return serviceableInputs;
}

/**
 * Evaluates cart serviceability for each item against the customer's pincode.
 * Multi-vendor carts evaluate each seller independently.
 */
export async function checkCartServiceability(
  pincode: string,
  items: CartItemInput[]
): Promise<ServiceabilityResult> {
  const cleanPincode = String(pincode || '').trim();
  const unserviceableItems: Array<{
    id: string;
    name: string;
    vendorId: string;
    vendorName: string;
  }> = [];

  if (!cleanPincode || !/^[1-9][0-9]{5}$/.test(cleanPincode)) {
    for (const item of items) {
      unserviceableItems.push({
        id: String(item.id),
        name: item.name || `Item ${item.id}`,
        vendorId: item.vendorId || 'vendor-1',
        vendorName: item.vendorName || 'Play Petal Marketplace',
      });
    }
    return {
      isServiceable: false,
      pincode: cleanPincode,
      unserviceableItems,
      message: 'Service is not available in your area. Please select a different address.',
    };
  }

  for (const item of items) {
    let resolvedVendorId = item.vendorId || '';
    let resolvedVendorName = item.vendorName || '';
    let resolvedName = item.name || '';

    if (!resolvedVendorId) {
      // 1. Try finding SellerOffer by id
      const offer = await prisma.sellerOffer.findUnique({
        where: { id: String(item.id) },
        include: { seller: true, masterProduct: true },
      });
      if (offer) {
        resolvedVendorId = offer.sellerId;
        resolvedVendorName = offer.seller?.shopName || 'Play Petal Marketplace';
        resolvedName = resolvedName || offer.masterProduct?.name || offer.id;
      } else {
        // 2. Try MasterProduct by id
        const masterProd = await prisma.masterProduct.findUnique({
          where: { id: String(item.id) },
          include: { offers: { where: { status: 'ACTIVE', moderationStatus: 'APPROVED' }, include: { seller: true } } },
        });
        if (masterProd && masterProd.offers.length > 0) {
          resolvedVendorId = masterProd.offers[0].sellerId;
          resolvedVendorName = masterProd.offers[0].seller?.shopName || 'Play Petal Marketplace';
          resolvedName = resolvedName || masterProd.name;
        } else {
          // 3. Try Product model fallback
          const legacyProd = await prisma.product.findUnique({ where: { id: String(item.id) } });
          if (legacyProd) {
            resolvedVendorId = legacyProd.vendorId || 'vendor-1';
            resolvedVendorName = legacyProd.vendorName || 'Play Petal Marketplace';
            resolvedName = resolvedName || legacyProd.name;
          } else {
            // 4. Try dbStore
            const matchedProd = dbStore.getProducts().find((p) => String(p.id) === String(item.id));
            resolvedVendorId = matchedProd?.vendorId || 'vendor-1';
            resolvedVendorName = matchedProd?.vendorName || matchedProd?.brand || 'Play Petal Marketplace';
            resolvedName = resolvedName || matchedProd?.name || `Item ${item.id}`;
          }
        }
      }
    }

    if (!resolvedVendorName) resolvedVendorName = 'Play Petal Marketplace';
    if (!resolvedName) resolvedName = `Item ${item.id}`;

    const isServiceable = await checkSellerServiceability(resolvedVendorId, cleanPincode);
    if (!isServiceable) {
      unserviceableItems.push({
        id: String(item.id),
        name: resolvedName,
        vendorId: resolvedVendorId,
        vendorName: resolvedVendorName,
      });
    }
  }

  const isServiceable = unserviceableItems.length === 0;

  return {
    isServiceable,
    pincode: cleanPincode,
    unserviceableItems,
    message: isServiceable
      ? 'Delivery is available for all items in your cart.'
      : 'Service is not available in your area. Please select a different address.',
  };
}
