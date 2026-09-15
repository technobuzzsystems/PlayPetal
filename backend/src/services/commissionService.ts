import { Prisma } from '@prisma/client';

export interface CommissionCalculationInput {
  subtotal: Prisma.Decimal | number | string;
  deliveryFee?: Prisma.Decimal | number | string | null;
  sellerId?: string;
  sellerType?: string;
  categoryId?: string;
}

export interface CommissionCalculationResult {
  grossAmount: Prisma.Decimal;
  commissionRate: Prisma.Decimal; // in percentage e.g. 10.00
  commissionAmount: Prisma.Decimal;
  platformFeeAmount: Prisma.Decimal;
  adjustmentAmount: Prisma.Decimal;
  payableAmount: Prisma.Decimal;
}

/**
 * Deterministic Marketplace Commission Engine for Phase 5C
 *
 * Rules:
 * 1. Default marketplace commission rate: 10.00% on item subtotal.
 * 2. Gross Amount = subtotal + deliveryFee.
 * 3. Commission Amount = round(subtotal * 0.10, 2).
 * 4. Platform Fee = 0.00 default.
 * 5. Adjustment = 0.00 default.
 * 6. Net Payable = Gross - Commission - Platform Fee + Adjustment.
 * 7. Strict Prisma.Decimal arithmetic; zero binary floating-point conversions.
 */
export class CommissionService {
  private defaultCommissionRate = new Prisma.Decimal('10.00'); // 10%
  private defaultPlatformFee = new Prisma.Decimal('0.00');

  public calculateCommission(input: CommissionCalculationInput): CommissionCalculationResult {
    const subtotal = new Prisma.Decimal(input.subtotal.toString());
    const deliveryFee = input.deliveryFee
      ? new Prisma.Decimal(input.deliveryFee.toString())
      : new Prisma.Decimal('0.00');

    if (subtotal.lessThan(0)) {
      throw new Error('INVALID_MONETARY_VALUE: subtotal cannot be negative.');
    }
    if (deliveryFee.lessThan(0)) {
      throw new Error('INVALID_MONETARY_VALUE: deliveryFee cannot be negative.');
    }

    const grossAmount = subtotal.plus(deliveryFee);

    // Standard rate is 10.00%
    const commissionRate = this.defaultCommissionRate;
    const rateFraction = commissionRate.dividedBy(100);

    // Commission is calculated on the item subtotal, rounded to 2 decimal places
    const commissionAmount = subtotal.times(rateFraction).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    const platformFeeAmount = this.defaultPlatformFee;
    const adjustmentAmount = new Prisma.Decimal('0.00');

    // Net payable to vendor
    const payableAmount = grossAmount
      .minus(commissionAmount)
      .minus(platformFeeAmount)
      .plus(adjustmentAmount);

    if (payableAmount.lessThan(0)) {
      throw new Error('INVALID_CALCULATION: Derived payable amount cannot be negative.');
    }

    return {
      grossAmount,
      commissionRate,
      commissionAmount,
      platformFeeAmount,
      adjustmentAmount,
      payableAmount,
    };
  }
}

export const commissionService = new CommissionService();
