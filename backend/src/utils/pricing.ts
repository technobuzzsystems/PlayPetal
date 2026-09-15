import { Prisma } from '@prisma/client';

/**
 * Validates the strict pricing invariants for SellerOffer:
 * 1. basePrice > 0
 * 2. salePrice is null OR (0 < salePrice < basePrice)
 */
export function validateOfferPrices(
  basePriceInput: Prisma.Decimal | number | string,
  salePriceInput?: Prisma.Decimal | number | string | null
): { isValid: boolean; error?: string } {
  try {
    const base = new Prisma.Decimal(basePriceInput.toString());

    if (base.lessThanOrEqualTo(0)) {
      return { isValid: false, error: 'basePrice must be strictly greater than 0' };
    }

    if (salePriceInput !== undefined && salePriceInput !== null) {
      const sale = new Prisma.Decimal(salePriceInput.toString());
      if (sale.lessThanOrEqualTo(0)) {
        return { isValid: false, error: 'salePrice must be strictly greater than 0 if provided' };
      }
      if (sale.greaterThanOrEqualTo(base)) {
        return { isValid: false, error: 'salePrice must be strictly less than basePrice' };
      }
    }

    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: `Invalid decimal money format: ${err.message}` };
  }
}

/**
 * Derives the authoritative effectivePrice using exact Decimal arithmetic.
 * Invariant: effectivePrice = (salePrice != null && 0 < salePrice < basePrice) ? salePrice : basePrice
 * Does NOT convert to binary floating-point numbers.
 */
export function calculateEffectivePrice(
  basePriceInput: Prisma.Decimal | number | string,
  salePriceInput?: Prisma.Decimal | number | string | null
): Prisma.Decimal {
  const base = new Prisma.Decimal(basePriceInput.toString());

  if (salePriceInput !== undefined && salePriceInput !== null) {
    const sale = new Prisma.Decimal(salePriceInput.toString());
    if (sale.greaterThan(0) && sale.lessThan(base)) {
      return sale;
    }
  }

  return base;
}

/**
 * Attaches the derived effectivePrice to an offer payload for API serialization.
 */
export function attachEffectivePrice<T extends { basePrice: Prisma.Decimal | number | string; salePrice?: Prisma.Decimal | number | string | null }>(
  offer: T
): T & { effectivePrice: Prisma.Decimal } {
  const effectivePrice = calculateEffectivePrice(offer.basePrice, offer.salePrice);
  return {
    ...offer,
    effectivePrice,
  };
}
