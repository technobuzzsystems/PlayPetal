// ============================================================================
// PHASE 5D: RETURN POLICY & ELIGIBILITY SERVICE
// Pure Decimal arithmetic, window validation, proportional discount allocation
// ============================================================================

import { Prisma, ReturnReason } from '@prisma/client';
import { prisma } from '../../prisma/client';

export interface ItemReturnEligibilityRequest {
  orderItemId: string;
  quantity: number;
}

export interface ItemEligibilityCalculation {
  orderItemId: string;
  productName: string;
  originalQuantity: number;
  alreadyReturnedQuantity: number;
  availableQuantity: number;
  requestedQuantity: number;
  unitPrice: Prisma.Decimal;
  allocatedDiscount: Prisma.Decimal;
  effectiveUnitPrice: Prisma.Decimal;
  totalRefundableAmount: Prisma.Decimal;
  returnWindowDays: number;
  daysSinceDelivery: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}

export interface ReturnEligibilityResult {
  isEligible: boolean;
  orderId: string;
  suborderId: string;
  sellerId: string;
  reasons: string[];
  itemCalculations: ItemEligibilityCalculation[];
  totalRefundableAmount: Prisma.Decimal;
}

export class ReturnPolicyService {
  /**
   * Evaluates return eligibility for specific items of a suborder.
   */
  async evaluateEligibility(
    orderId: string,
    suborderId: string,
    items: ItemReturnEligibilityRequest[],
    returnReason: ReturnReason
  ): Promise<ReturnEligibilityResult> {
    const reasons: string[] = [];

    // 1. Fetch Order and Suborder with full relations
    const suborder = await prisma.sellerSuborder.findUnique({
      where: { id: suborderId },
      include: {
        order: true,
        items: {
          include: {
            offer: true,
            returnItems: {
              include: {
                returnRequest: true,
              },
            },
          },
        },
      },
    });

    if (!suborder || suborder.orderId !== orderId) {
      return {
        isEligible: false,
        orderId,
        suborderId,
        sellerId: '',
        reasons: ['Suborder not found or does not belong to the specified order'],
        itemCalculations: [],
        totalRefundableAmount: new Prisma.Decimal(0),
      };
    }

    // 2. Validate Suborder Status: must be DELIVERED
    if (suborder.status !== 'DELIVERED') {
      reasons.push(`Suborder status is ${suborder.status}. Only DELIVERED suborders are eligible for returns.`);
    }

    const deliveryDate = suborder.deliveredAt || suborder.updatedAt || new Date();
    const now = new Date();
    const msDiff = Math.max(0, now.getTime() - deliveryDate.getTime());
    const daysSinceDelivery = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    // 3. Proportional Discount Base
    const orderDiscount = new Prisma.Decimal(suborder.order.discount || 0);
    const orderSubtotal = new Prisma.Decimal(suborder.order.subtotal || 0);

    const itemCalculations: ItemEligibilityCalculation[] = [];
    let grandTotalRefundable = new Prisma.Decimal(0);

    for (const reqItem of items) {
      const orderItem = suborder.items.find((i) => i.id === reqItem.orderItemId);
      if (!orderItem) {
        itemCalculations.push({
          orderItemId: reqItem.orderItemId,
          productName: 'Unknown Item',
          originalQuantity: 0,
          alreadyReturnedQuantity: 0,
          availableQuantity: 0,
          requestedQuantity: reqItem.quantity,
          unitPrice: new Prisma.Decimal(0),
          allocatedDiscount: new Prisma.Decimal(0),
          effectiveUnitPrice: new Prisma.Decimal(0),
          totalRefundableAmount: new Prisma.Decimal(0),
          returnWindowDays: 0,
          daysSinceDelivery,
          isEligible: false,
          ineligibilityReason: 'Item does not belong to this suborder',
        });
        continue;
      }

      // Return window for this specific item / seller offer
      const returnWindowDays = orderItem.offer?.returnWindowDays ?? 7;
      let isItemEligible = true;
      let itemIneligibleReason: string | undefined;

      // Window check
      if (daysSinceDelivery > returnWindowDays) {
        isItemEligible = false;
        itemIneligibleReason = `Return window of ${returnWindowDays} days has expired (${daysSinceDelivery} days since delivery)`;
      }

      // Quantity check
      // Active returns exclude REJECTED and CLOSED (where no refund given)
      const priorReturnedQty = orderItem.returnItems
        .filter((ri) => ri.returnRequest.status !== 'REJECTED' && ri.returnRequest.status !== 'CLOSED')
        .reduce((sum, ri) => sum + ri.quantity, 0);

      const availableQuantity = Math.max(0, orderItem.quantity - priorReturnedQty);

      if (reqItem.quantity <= 0) {
        isItemEligible = false;
        itemIneligibleReason = 'Requested quantity must be greater than 0';
      } else if (reqItem.quantity > availableQuantity) {
        isItemEligible = false;
        itemIneligibleReason = `Requested quantity (${reqItem.quantity}) exceeds available quantity (${availableQuantity})`;
      }

      // Price & Discount Calculation (Decimal only)
      const unitPrice = orderItem.unitPriceSnapshot
        ? new Prisma.Decimal(orderItem.unitPriceSnapshot)
        : new Prisma.Decimal(orderItem.price);
      const lineItemGross = unitPrice.times(orderItem.quantity);

      // Proportional discount allocated to this line item
      let lineItemDiscount = new Prisma.Decimal(0);
      if (orderDiscount.gt(0) && orderSubtotal.gt(0)) {
        lineItemDiscount = orderDiscount
          .times(lineItemGross)
          .dividedBy(orderSubtotal)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      }

      // Effective unit price after proportional discount
      const perUnitDiscount = lineItemDiscount
        .dividedBy(orderItem.quantity)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const effectiveUnitPrice = Prisma.Decimal.max(
        new Prisma.Decimal(0),
        unitPrice.minus(perUnitDiscount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      );

      const totalItemRefundable = effectiveUnitPrice
        .times(reqItem.quantity)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      if (isItemEligible) {
        grandTotalRefundable = grandTotalRefundable.plus(totalItemRefundable);
      } else if (itemIneligibleReason) {
        reasons.push(`${orderItem.name}: ${itemIneligibleReason}`);
      }

      itemCalculations.push({
        orderItemId: orderItem.id,
        productName: orderItem.name,
        originalQuantity: orderItem.quantity,
        alreadyReturnedQuantity: priorReturnedQty,
        availableQuantity,
        requestedQuantity: reqItem.quantity,
        unitPrice,
        allocatedDiscount: lineItemDiscount,
        effectiveUnitPrice,
        totalRefundableAmount: totalItemRefundable,
        returnWindowDays,
        daysSinceDelivery,
        isEligible: isItemEligible,
        ineligibilityReason: itemIneligibleReason,
      });
    }

    const allItemsEligible = itemCalculations.length > 0 && itemCalculations.every((i) => i.isEligible);
    const isOverallEligible = reasons.length === 0 && allItemsEligible;

    return {
      isEligible: isOverallEligible,
      orderId,
      suborderId,
      sellerId: suborder.sellerId,
      reasons,
      itemCalculations,
      totalRefundableAmount: grandTotalRefundable,
    };
  }
}

export const returnPolicyService = new ReturnPolicyService();
