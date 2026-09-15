import {
  Prisma,
  SellerOffer,
  VendorProfile,
  OfferInventory,
  OfferStatus,
  OfferModerationStatus,
  WarrantyType,
  SellerType,
} from '@prisma/client';
import { calculateEffectivePrice, validateOfferPrices } from '../utils/pricing';

export type OfferWithRelations = SellerOffer & {
  seller: VendorProfile & { user?: { id?: string; status?: string } | null };
  inventory?: OfferInventory | null;
};

export interface EvaluatedOffer {
  offerId: string;
  sellerId: string;
  sellerName: string;
  sellerType: SellerType;
  effectivePrice: Prisma.Decimal;
  basePrice: Prisma.Decimal;
  salePrice: Prisma.Decimal | null;
  deliveryDays: number;
  sellerRating: number;
  onTimeRate: number;
  warrantyType: WarrantyType;
  scores: {
    priceScore: number;
    speedScore: number;
    trustScore: number;
    warrantyScore: number;
    totalScore: number;
  };
  createdAt: Date;
}

export interface DisqualifiedOffer {
  offerId: string;
  sellerId: string;
  sellerName: string;
  effectivePrice?: Prisma.Decimal;
  reasons: string[];
}

export interface BuyBoxResult {
  winnerOfferId: string | null;
  masterProductId: string;
  effectivePrice: Prisma.Decimal | null;
  totalScore: number;
  scoreBreakdown: {
    priceScore: number;
    speedScore: number;
    trustScore: number;
    warrantyScore: number;
  } | null;
  tieBreakApplied: boolean;
  tieBreakReason?: string;
  reason: string;
  eligibleOffers: EvaluatedOffer[];
  disqualifiedOffers: DisqualifiedOffer[];
  calculatedAt: string;
}

/**
 * Calculates the Speed Score (0 - 100) based on guaranteed estimated delivery days.
 * 1 day = 100, 2 days = 85, 3 days = 65, 4-5 days = 45, 6+ days = 20
 */
export function calculateSpeedScore(deliveryDays: number): number {
  if (deliveryDays <= 1) return 100;
  if (deliveryDays === 2) return 85;
  if (deliveryDays === 3) return 65;
  if (deliveryDays <= 5) return 45;
  return 20;
}

/**
 * Calculates the Trust Score (0 - 100) based on seller rating and on-time dispatch rate.
 * Formula: (Rating / 5.0) * 70 + (OnTimeRate * 0.3)
 */
export function calculateTrustScore(rating: number, onTimeRate: number): number {
  const r = typeof rating === 'number' && !isNaN(rating) ? rating : 5.0;
  const o = typeof onTimeRate === 'number' && !isNaN(onTimeRate) ? onTimeRate : 100.0;
  const clampedRating = Math.max(0, Math.min(5.0, r));
  const clampedOnTime = Math.max(0, Math.min(100.0, o));
  const trust = (clampedRating / 5.0) * 70.0 + (clampedOnTime / 100.0) * 30.0;
  return Math.round(trust * 100) / 100;
}

/**
 * Calculates the Warranty Score (0 - 100).
 * OFFICIAL_MANUFACTURER_WARRANTY = 100, SELLER_WARRANTY = 65, STANDARD_REPLACEMENT_ONLY = 35
 */
export function calculateWarrantyScore(warrantyType: WarrantyType): number {
  switch (warrantyType) {
    case WarrantyType.OFFICIAL_MANUFACTURER_WARRANTY:
      return 100;
    case WarrantyType.SELLER_WARRANTY:
      return 65;
    case WarrantyType.STANDARD_REPLACEMENT_ONLY:
    default:
      return 35;
  }
}

/**
 * Evaluates all competing SellerOffers for a MasterProduct and deterministically selects
 * the winning Buy Box offer.
 */
export function evaluateBuyBox(
  masterProductId: string,
  offers: OfferWithRelations[]
): BuyBoxResult {
  const calculatedAt = new Date().toISOString();
  const eligibleCandidates: {
    offer: OfferWithRelations;
    effectivePrice: Prisma.Decimal;
  }[] = [];
  const disqualifiedOffers: DisqualifiedOffer[] = [];

  // Step 1: Filter through Hard Eligibility Gates
  for (const offer of offers) {
    const reasons: string[] = [];

    // Gate 1: Offer Status & Moderation
    if (offer.status !== OfferStatus.ACTIVE) {
      reasons.push(`Offer status is '${offer.status}' (must be ACTIVE)`);
    }
    if (offer.moderationStatus !== OfferModerationStatus.APPROVED) {
      reasons.push(`Offer moderationStatus is '${offer.moderationStatus}' (must be APPROVED)`);
    }

    // Gate 2: Linked Seller Active & Performance
    if (!offer.seller) {
      reasons.push('Seller profile is missing');
    } else {
      if (offer.seller.status !== 'ACTIVE' && offer.seller.status !== 'APPROVED') {
        reasons.push(`Seller status is '${offer.seller.status || 'UNKNOWN'}' (must be ACTIVE or APPROVED)`);
      }
      const orderCompletionRate = offer.seller.orderCompletionRate ?? 100.0;
      if (orderCompletionRate < 85.0) {
        reasons.push(`Seller order completion rate is ${orderCompletionRate}% (minimum required: 85.0%)`);
      }
      if (offer.seller.user?.status && offer.seller.user.status !== 'ACTIVE') {
        reasons.push(`Seller user account status is '${offer.seller.user.status}' (must be ACTIVE)`);
      }
    }

    // Gate 3: Available Inventory > 0
    const availableStock = offer.inventory?.availableStock ?? 0;
    if (availableStock <= 0) {
      reasons.push(`Offer inventory availableStock is ${availableStock} (must be > 0)`);
    }

    // Gate 4: Price Invariants
    const priceValidation = validateOfferPrices(offer.basePrice, offer.salePrice);
    if (!priceValidation.isValid) {
      reasons.push(`Invalid price invariant: ${priceValidation.error}`);
    }

    let effectivePrice: Prisma.Decimal | null = null;
    if (priceValidation.isValid) {
      effectivePrice = calculateEffectivePrice(offer.basePrice, offer.salePrice);
      if (effectivePrice.lessThanOrEqualTo(0)) {
        reasons.push(`Effective price is non-positive: ${effectivePrice.toString()}`);
      }
    }

    if (reasons.length > 0 || !effectivePrice) {
      disqualifiedOffers.push({
        offerId: offer.id,
        sellerId: offer.sellerId,
        sellerName: offer.seller?.shopName || 'Unknown Seller',
        effectivePrice: effectivePrice || undefined,
        reasons,
      });
    } else {
      eligibleCandidates.push({
        offer,
        effectivePrice,
      });
    }
  }

  // If no eligible offers remain
  if (eligibleCandidates.length === 0) {
    return {
      winnerOfferId: null,
      masterProductId,
      effectivePrice: null,
      totalScore: 0,
      scoreBreakdown: null,
      tieBreakApplied: false,
      reason: 'No eligible active offers with in-stock inventory found for this product.',
      eligibleOffers: [],
      disqualifiedOffers,
      calculatedAt,
    };
  }

  // Step 2: Determine P_min (lowest eligible effective price)
  let pMin = eligibleCandidates[0].effectivePrice;
  for (const candidate of eligibleCandidates) {
    if (candidate.effectivePrice.lessThan(pMin)) {
      pMin = candidate.effectivePrice;
    }
  }

  // Guard against non-positive P_min
  if (pMin.lessThanOrEqualTo(0)) {
    return {
      winnerOfferId: null,
      masterProductId,
      effectivePrice: null,
      totalScore: 0,
      scoreBreakdown: null,
      tieBreakApplied: false,
      reason: `Fatal error: Lowest price P_min is non-positive (${pMin.toString()}).`,
      eligibleOffers: [],
      disqualifiedOffers,
      calculatedAt,
    };
  }

  // Step 3: Compute normalized scores for each eligible offer
  const evaluatedOffers: EvaluatedOffer[] = eligibleCandidates.map(({ offer, effectivePrice }) => {
    // 1. Price Score (40%): max(0, 100 * (1 - (P - P_min) / P_min))
    const priceDiff = effectivePrice.sub(pMin);
    const ratio = priceDiff.div(pMin);
    const rawPriceScore = new Prisma.Decimal(100).mul(new Prisma.Decimal(1).sub(ratio)).toNumber();
    const priceScore = Math.max(0, Math.min(100, Math.round(rawPriceScore * 100) / 100));

    // 2. Speed Score (25%)
    const deliveryDays = offer.estimatedDeliveryDays ?? 5;
    const speedScore = calculateSpeedScore(deliveryDays);

    // 3. Trust Score (20%)
    const rating = offer.seller.rating ?? 5.0;
    const onTimeRate = offer.seller.onTimeDispatchRate ?? 100.0;
    const trustScore = calculateTrustScore(rating, onTimeRate);

    // 4. Warranty Score (15%)
    const warrantyScore = calculateWarrantyScore(offer.warrantyType);

    // Weighted Total Score
    const totalScoreRaw =
      priceScore * 0.4 +
      speedScore * 0.25 +
      trustScore * 0.2 +
      warrantyScore * 0.15;
    const totalScore = Math.round(totalScoreRaw * 1000) / 1000;

    return {
      offerId: offer.id,
      sellerId: offer.sellerId,
      sellerName: offer.seller.shopName,
      sellerType: offer.seller.sellerType,
      effectivePrice,
      basePrice: new Prisma.Decimal(offer.basePrice.toString()),
      salePrice: offer.salePrice ? new Prisma.Decimal(offer.salePrice.toString()) : null,
      deliveryDays,
      sellerRating: rating,
      onTimeRate,
      warrantyType: offer.warrantyType,
      scores: {
        priceScore,
        speedScore,
        trustScore,
        warrantyScore,
        totalScore,
      },
      createdAt: offer.createdAt,
    };
  });

  // Step 4: Deterministic Ranking & Tie-Breaking
  evaluatedOffers.sort((a, b) => {
    // Primary: Total Score descending
    const scoreDiff = b.scores.totalScore - a.scores.totalScore;
    if (Math.abs(scoreDiff) > 0.001) {
      return scoreDiff;
    }

    // Tie-break 1: Lower Effective Price
    if (!a.effectivePrice.equals(b.effectivePrice)) {
      return a.effectivePrice.lessThan(b.effectivePrice) ? -1 : 1;
    }

    // Tie-break 2: Faster Delivery (fewer days)
    if (a.deliveryDays !== b.deliveryDays) {
      return a.deliveryDays - b.deliveryDays;
    }

    // Tie-break 3: Higher Seller Rating
    if (Math.abs(a.sellerRating - b.sellerRating) > 0.001) {
      return b.sellerRating - a.sellerRating;
    }

    // Tie-break 4: FIRST_PARTY preference
    if (a.sellerType !== b.sellerType) {
      return a.sellerType === SellerType.FIRST_PARTY ? -1 : 1;
    }

    // Tie-break 5: Earlier offer createdAt
    const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    // Tie-break 6: Final stable string comparison on offerId
    return a.offerId.localeCompare(b.offerId);
  });

  const winner = evaluatedOffers[0];
  let tieBreakApplied = false;
  let tieBreakReason: string | undefined;

  if (evaluatedOffers.length > 1) {
    const runnerUp = evaluatedOffers[1];
    if (Math.abs(winner.scores.totalScore - runnerUp.scores.totalScore) <= 0.001) {
      tieBreakApplied = true;
      if (!winner.effectivePrice.equals(runnerUp.effectivePrice)) {
        tieBreakReason = `Lower effective price (₹${winner.effectivePrice.toString()} vs ₹${runnerUp.effectivePrice.toString()})`;
      } else if (winner.deliveryDays !== runnerUp.deliveryDays) {
        tieBreakReason = `Faster estimated delivery (${winner.deliveryDays} days vs ${runnerUp.deliveryDays} days)`;
      } else if (Math.abs(winner.sellerRating - runnerUp.sellerRating) > 0.001) {
        tieBreakReason = `Higher seller rating (${winner.sellerRating} vs ${runnerUp.sellerRating})`;
      } else if (winner.sellerType !== runnerUp.sellerType) {
        tieBreakReason = `First-party preference (${winner.sellerType} vs ${runnerUp.sellerType})`;
      } else if (winner.createdAt.getTime() !== runnerUp.createdAt.getTime()) {
        tieBreakReason = `Earlier offer creation timestamp (${winner.createdAt.toISOString()})`;
      } else {
        tieBreakReason = `Stable offer ID sorting (${winner.offerId} vs ${runnerUp.offerId})`;
      }
    }
  }

  const reason = tieBreakApplied
    ? `Selected via tie-breaker (${tieBreakReason}) with composite score ${winner.scores.totalScore}.`
    : `Selected with highest composite score ${winner.scores.totalScore} across price (₹${winner.effectivePrice.toString()}), speed (${winner.deliveryDays}d), rating (${winner.sellerRating}★), and warranty (${winner.warrantyType}).`;

  return {
    winnerOfferId: winner.offerId,
    masterProductId,
    effectivePrice: winner.effectivePrice,
    totalScore: winner.scores.totalScore,
    scoreBreakdown: {
      priceScore: winner.scores.priceScore,
      speedScore: winner.scores.speedScore,
      trustScore: winner.scores.trustScore,
      warrantyScore: winner.scores.warrantyScore,
    },
    tieBreakApplied,
    tieBreakReason,
    reason,
    eligibleOffers: evaluatedOffers,
    disqualifiedOffers,
    calculatedAt,
  };
}
