// ============================================================================
// PHASE 5D: RETURN SERVICE
// Complete Return Lifecycle: Creation, Seller Review, Reverse Logistics,
// Inspection, and Refund Execution
// ============================================================================

import {
  Prisma,
  ReturnReason,
  ReturnStatus,
  InspectionOutcome,
  ReverseShipmentStatus,
} from '@prisma/client';
import { prisma } from '../../prisma/client';
import { returnPolicyService, ItemReturnEligibilityRequest } from './returnPolicyService';
import { refundService } from './refundService';
import { ShiprocketProvider } from '../shipping/ShiprocketProvider';
import { logSecurityAudit } from '../../utils/security';

export interface CreateReturnRequestInput {
  orderId: string;
  suborderId: string;
  customerId?: string;
  items: ItemReturnEligibilityRequest[];
  reason: ReturnReason;
  customerNotes?: string;
}

export interface ReviewReturnItemInput {
  returnItemId: string;
  approvedQuantity: number;
}

export interface ReviewReturnRequestInput {
  returnRequestId: string;
  actorUserId: string;
  actorRole: string;
  action: 'APPROVE' | 'REJECT';
  items?: ReviewReturnItemInput[];
  rejectionReason?: string;
  notes?: string;
}

export interface InspectReturnItemInput {
  returnItemId: string;
  receivedQuantity: number;
  approvedQuantity: number;
  outcome: InspectionOutcome;
  notes?: string;
}

export interface InspectReturnRequestInput {
  returnRequestId: string;
  actorUserId: string;
  actorRole: string;
  items: InspectReturnItemInput[];
  inspectionNotes?: string;
}

export class ReturnService {
  private shippingProvider: ShiprocketProvider;

  constructor() {
    this.shippingProvider = new ShiprocketProvider();
  }

  async generateReturnNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.returnRequest.count();
    let candidate = `RET-${year}-${String(count + 1).padStart(5, '0')}`;
    const exists = await prisma.returnRequest.findUnique({ where: { returnNumber: candidate } });
    if (exists) {
      const nonce = Math.floor(100 + Math.random() * 900);
      candidate = `RET-${year}-${Date.now().toString().slice(-6)}${nonce}`;
    }
    return candidate;
  }

  /**
   * Normalizes loose string reason to schema ReturnReason enum
   */
  normalizeReturnReason(raw: string): ReturnReason {
    const upper = (raw || '').toUpperCase().trim();
    if (upper === 'DEFECTIVE' || upper === 'DEFECTIVE_OR_NOT_WORKING') return 'DEFECTIVE_OR_NOT_WORKING';
    if (upper === 'DAMAGED' || upper === 'DAMAGED_ON_DELIVERY') return 'DAMAGED_ON_DELIVERY';
    if (upper === 'WRONG_ITEM' || upper === 'WRONG_ITEM_SENT') return 'WRONG_ITEM_SENT';
    if (upper === 'NOT_AS_DESCRIBED') return 'NOT_AS_DESCRIBED';
    if (upper === 'QUALITY_NOT_ACCEPTABLE') return 'QUALITY_NOT_ACCEPTABLE';
    if (upper === 'MISSING_PARTS' || upper === 'MISSING_PARTS_OR_ACCESSORIES') return 'MISSING_PARTS_OR_ACCESSORIES';
    if (upper === 'SIZE_OR_FIT_INCORRECT') return 'SIZE_OR_FIT_INCORRECT';
    if (upper === 'CUSTOMER_CHANGED_MIND') return 'CUSTOMER_CHANGED_MIND';
    return (raw as ReturnReason) || 'DEFECTIVE_OR_NOT_WORKING';
  }

  /**
   * Creates a new customer return request after full policy and eligibility verification.
   */
  async createReturnRequest(input: CreateReturnRequestInput) {
    const { orderId, suborderId, customerId, items, customerNotes } = input;
    const reason = this.normalizeReturnReason(input.reason);

    // 1. Evaluate Eligibility
    const eligibility = await returnPolicyService.evaluateEligibility(orderId, suborderId, items, reason);
    if (!eligibility.isEligible) {
      throw new Error(`Return request ineligible: ${eligibility.reasons.join(', ')}`);
    }

    const returnNumber = await this.generateReturnNumber();

    // 2. Atomic creation of ReturnRequest and ReturnItems
    const createdReturn = await prisma.$transaction(async (tx) => {
      const ret = await tx.returnRequest.create({
        data: {
          returnNumber,
          orderId,
          suborderId,
          customerId: customerId || null,
          sellerId: eligibility.sellerId,
          status: 'REQUESTED',
          reason,
          customerNotes,
          refundAmount: eligibility.totalRefundableAmount,
        },
      });

      for (const itemCalc of eligibility.itemCalculations) {
        if (!itemCalc.isEligible) continue;
        await tx.returnItem.create({
          data: {
            returnRequestId: ret.id,
            orderItemId: itemCalc.orderItemId,
            quantity: itemCalc.requestedQuantity,
            unitPrice: itemCalc.unitPrice,
            refundAmount: itemCalc.totalRefundableAmount,
            approvedQuantity: 0,
            receivedQuantity: 0,
            refundedQuantity: 0,
          },
        });
      }

      // Update suborder status to RETURN_REQUESTED if not already in a return state
      await tx.sellerSuborder.update({
        where: { id: suborderId },
        data: {
          status: 'RETURN_REQUESTED',
        },
      });

      return ret;
    });

    await logSecurityAudit('RETURN_REQUEST_CREATED', {
      userId: customerId,
      role: 'CUSTOMER',
      status: 'SUCCESS',
      resourceId: createdReturn.id,
      reason: `Return request ${createdReturn.returnNumber} created for suborder ${suborderId}`,
    });

    await logSecurityAudit('RETURN_REQUESTED', {
      userId: customerId,
      role: 'CUSTOMER',
      status: 'SUCCESS',
      resourceId: createdReturn.id,
      reason: `Return requested: ${createdReturn.returnNumber}`,
    });

    return prisma.returnRequest.findUnique({
      where: { id: createdReturn.id },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        suborder: true,
        order: true,
      },
    });
  }

  /**
   * Reviews a return request (Vendor or Admin approval / rejection).
   */
  async reviewReturnRequest(input: ReviewReturnRequestInput) {
    const { returnRequestId, actorUserId, actorRole, action, items, rejectionReason, notes } = input;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        items: true,
        seller: true,
      },
    });

    if (!returnRequest) {
      throw new Error(`Return request not found: ${returnRequestId}`);
    }

    if (returnRequest.status !== 'REQUESTED') {
      throw new Error(`Return request is already in status ${returnRequest.status}`);
    }

    // Role check: Admin or matching Seller
    if (actorRole !== 'ADMIN' && actorRole !== 'ORDER_MANAGER') {
      if (returnRequest.seller.userId !== actorUserId) {
        throw new Error('Unauthorized to review this return request');
      }
    }

    if (action === 'REJECT') {
      const updated = await prisma.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || 'Rejected by merchant',
          adminNotes: notes,
        },
        include: { items: true },
      });

      await logSecurityAudit('RETURN_STATUS_UPDATED', {
        userId: actorUserId,
        role: actorRole,
        status: 'SUCCESS',
        resourceId: returnRequestId,
        reason: `Return request rejected: ${rejectionReason}`,
      });

      return updated;
    }

    // APPROVE
    const updated = await prisma.$transaction(async (tx) => {
      let anyApproved = false;

      for (const retItem of returnRequest.items) {
        const approvedItemInput = items?.find((i) => i.returnItemId === retItem.id);
        const approvedQty = approvedItemInput !== undefined ? approvedItemInput.approvedQuantity : retItem.quantity;

        if (approvedQty > 0) {
          anyApproved = true;
          await tx.returnItem.update({
            where: { id: retItem.id },
            data: {
              approvedQuantity: Math.min(approvedQty, retItem.quantity),
            },
          });
        }
      }

      const nextStatus: ReturnStatus = anyApproved ? 'APPROVED' : 'REJECTED';

      return tx.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: nextStatus,
          adminNotes: notes,
        },
        include: { items: true },
      });
    });

    await logSecurityAudit('RETURN_STATUS_UPDATED', {
      userId: actorUserId,
      role: actorRole,
      status: 'SUCCESS',
      resourceId: returnRequestId,
      reason: `Return request ${action.toLowerCase()}d by ${actorRole}`,
    });

    if (action === 'APPROVE') {
      await logSecurityAudit('RETURN_APPROVED', {
        userId: actorUserId,
        role: actorRole,
        status: 'SUCCESS',
        resourceId: returnRequestId,
        reason: `Return request approved: ${returnRequestId}`,
      });
    }

    return updated;
  }

  /**
   * Dispatches reverse pickup logistics for an approved return request.
   */
  async dispatchReverseLogistics(returnRequestId: string) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        order: true,
        suborder: true,
        items: {
          include: {
            orderItem: true,
          },
        },
        seller: true,
      },
    });

    if (!returnRequest) {
      throw new Error(`Return request not found: ${returnRequestId}`);
    }

    if (returnRequest.status !== 'APPROVED') {
      throw new Error(`Return request must be in APPROVED status to dispatch reverse logistics (current: ${returnRequest.status})`);
    }

    // Prepare addresses
    const shippingAddress = (returnRequest.order.shippingAddress as any) || {};
    const pickupAddress = {
      street: shippingAddress.street || shippingAddress.address || 'Customer Address',
      city: shippingAddress.city || 'Bengaluru',
      state: shippingAddress.state || 'Karnataka',
      postalCode: shippingAddress.postalCode || shippingAddress.pincode || '560001',
      country: 'India',
    };

    const deliveryAddress = {
      street: returnRequest.seller.address || 'Seller Warehouse Facility',
      city: returnRequest.seller.city || 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560002',
      country: 'India',
    };

    // Call shipping provider for reverse pickup
    const reverseShipmentResult = await this.shippingProvider.createReturnShipment({
      returnRequestId: returnRequest.id,
      returnNumber: returnRequest.returnNumber,
      suborderNumber: returnRequest.suborder.suborderNumber,
      pickupCustomerName: returnRequest.order.customerName,
      pickupCustomerPhone: returnRequest.order.customerPhone || '9876543210',
      pickupAddress,
      deliverySellerName: returnRequest.seller.shopName,
      deliverySellerAddress: deliveryAddress,
      items: returnRequest.items.map((i) => ({
        name: i.orderItem.name,
        sku: i.orderItem.sku || 'RETURN-SKU',
        units: i.approvedQuantity || i.quantity,
        sellingPrice: Number(i.unitPrice),
      })),
    });

    // Save ReturnShipment record
    const createdShipment = await prisma.$transaction(async (tx) => {
      const rs = await tx.returnShipment.create({
        data: {
          returnRequestId: returnRequest.id,
          provider: reverseShipmentResult.provider,
          providerShipmentId: reverseShipmentResult.providerShipmentId,
          awbNumber: reverseShipmentResult.awbNumber,
          shippingCarrier: reverseShipmentResult.shippingCarrier,
          labelUrl: reverseShipmentResult.labelUrl,
          status: 'PICKUP_SCHEDULED',
          pickupAddress,
          deliveryAddress,
        },
      });

      // Add initial tracking event
      await tx.returnTrackingEvent.create({
        data: {
          returnShipmentId: rs.id,
          providerEventId: `${rs.awbNumber || rs.id}-EVT-INIT`,
          providerStatus: 'PICKUP_SCHEDULED',
          normalizedStatus: 'PICKUP_SCHEDULED',
          location: pickupAddress.city,
          description: 'Reverse pickup scheduled with courier partner',
        },
      });

      await tx.returnRequest.update({
        where: { id: returnRequest.id },
        data: {
          status: 'PICKUP_SCHEDULED',
        },
      });

      return rs;
    });

    await logSecurityAudit('REVERSE_SHIPMENT_DISPATCHED', {
      status: 'SUCCESS',
      resourceId: returnRequestId,
      reason: `Reverse shipment ${createdShipment.awbNumber} scheduled via ${createdShipment.provider}`,
    });

    await logSecurityAudit('RETURN_REVERSE_DISPATCHED', {
      status: 'SUCCESS',
      resourceId: returnRequestId,
      reason: `Reverse shipment ${createdShipment.awbNumber} dispatched`,
    });

    return prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        shipment: {
          include: {
            trackingEvents: true,
          },
        },
        items: true,
      },
    });
  }

  /**
   * Advances reverse shipment status (e.g. simulated transit or courier webhook).
   */
  async updateReverseShipmentStatus(
    idOrReturnId: string,
    newStatus: ReverseShipmentStatus,
    locationOrData?: string | { location?: string; description?: string; eventCode?: string },
    descriptionParam?: string
  ) {
    const location = typeof locationOrData === 'string' ? locationOrData : locationOrData?.location;
    const description = typeof locationOrData === 'string' ? descriptionParam : locationOrData?.description;

    let returnShipment = await prisma.returnShipment.findUnique({
      where: { id: idOrReturnId },
      include: { returnRequest: true },
    });

    if (!returnShipment) {
      returnShipment = await prisma.returnShipment.findFirst({
        where: { returnRequestId: idOrReturnId },
        include: { returnRequest: true },
      });
    }

    if (!returnShipment) {
      throw new Error(`Return shipment not found for: ${idOrReturnId}`);
    }

    const returnShipmentId = returnShipment.id;

    const updated = await prisma.$transaction(async (tx) => {
      const rs = await tx.returnShipment.update({
        where: { id: returnShipmentId },
        data: {
          status: newStatus,
          deliveredAt: newStatus === 'DELIVERED' ? new Date() : undefined,
          shippedAt: newStatus === 'PICKED_UP' ? new Date() : undefined,
        },
      });

      await tx.returnTrackingEvent.create({
        data: {
          returnShipmentId,
          providerEventId: `${rs.awbNumber || rs.id}-${newStatus}-${Date.now()}`,
          providerStatus: newStatus,
          normalizedStatus: newStatus,
          location: location || 'Hub Facility',
          description: description || `Reverse shipment status updated to ${newStatus}`,
        },
      });

      // Map reverse shipment status to ReturnRequest status
      let reqStatus: ReturnStatus | undefined;
      if (newStatus === 'PICKED_UP' || newStatus === 'IN_TRANSIT') {
        reqStatus = 'IN_TRANSIT';
      } else if (newStatus === 'DELIVERED') {
        reqStatus = 'DELIVERED_TO_SELLER';
      }

      if (reqStatus) {
        await tx.returnRequest.update({
          where: { id: returnShipment.returnRequestId },
          data: { status: reqStatus },
        });
      }

      return rs;
    });

    await logSecurityAudit('REVERSE_TRACKING_UPDATED', {
      status: 'SUCCESS',
      resourceId: returnShipmentId,
      reason: `Reverse shipment transitioned to ${newStatus}`,
    });

    return updated;
  }

  /**
   * Normalizes loose string outcome to schema InspectionOutcome enum
   */
  normalizeInspectionOutcome(raw: string): InspectionOutcome {
    const upper = (raw || '').toUpperCase().trim();
    if (upper.includes('RESTOCK') || upper === 'ACCEPT_FULL_REFUND' || upper === 'ACCEPT') return 'ACCEPT_FULL_REFUND';
    if (upper.includes('PARTIAL') || upper === 'ACCEPT_PARTIAL_REFUND') return 'ACCEPT_PARTIAL_REFUND';
    if (upper.includes('DAMAGED') || upper.includes('SCRAP') || upper === 'REJECT_DAMAGED_BY_CUSTOMER') return 'REJECT_DAMAGED_BY_CUSTOMER';
    if (upper.includes('FRAUD') || upper.includes('VIOLATION') || upper === 'REJECT_POLICY_VIOLATION') return 'REJECT_POLICY_VIOLATION';
    return (raw as InspectionOutcome) || 'ACCEPT_FULL_REFUND';
  }

  /**
   * Submits inspection outcome by the seller or warehouse.
   */
  async inspectReturn(input: InspectReturnRequestInput) {
    const { returnRequestId, actorUserId, actorRole, items, inspectionNotes } = input;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        seller: true,
      },
    });

    if (!returnRequest) {
      throw new Error(`Return request not found: ${returnRequestId}`);
    }

    // Inspection allowed once delivered to seller or directly if seller inspects
    const allowedStatuses: ReturnStatus[] = ['DELIVERED_TO_SELLER', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'APPROVED'];
    if (!allowedStatuses.includes(returnRequest.status)) {
      throw new Error(`Cannot inspect return request in status ${returnRequest.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      let anyItemApprovedForRefund = false;

      for (const itemInput of items) {
        const retItem = returnRequest.items.find((i) => i.id === itemInput.returnItemId);
        if (!retItem) continue;

        const outcome = this.normalizeInspectionOutcome(itemInput.outcome);
        const shouldRestock =
          (String(itemInput.outcome).includes('RESTOCK') || outcome === 'ACCEPT_FULL_REFUND') &&
          itemInput.approvedQuantity > 0;

        const approvedForRefund =
          outcome === 'ACCEPT_FULL_REFUND' || outcome === 'ACCEPT_PARTIAL_REFUND';

        if (approvedForRefund && itemInput.approvedQuantity > 0) {
          anyItemApprovedForRefund = true;
        }

        await tx.returnItem.update({
          where: { id: retItem.id },
          data: {
            receivedQuantity: itemInput.receivedQuantity,
            approvedQuantity: approvedForRefund ? itemInput.approvedQuantity : 0,
            inspectionOutcome: outcome,
          },
        });

        // Restock inventory if authorized
        if (shouldRestock) {
          if (retItem.orderItem?.productId) {
            await tx.product.update({
              where: { id: retItem.orderItem.productId },
              data: {
                stock: { increment: itemInput.approvedQuantity },
              },
            }).catch(() => null);
          }
          if (retItem.orderItem?.offerId) {
            await tx.offerInventory.update({
              where: { offerId: retItem.orderItem.offerId },
              data: {
                physicalStock: { increment: itemInput.approvedQuantity },
                availableStock: { increment: itemInput.approvedQuantity },
              },
            }).catch(() => null);
          }
        }
      }

      const nextStatus: ReturnStatus = anyItemApprovedForRefund ? 'INSPECTED' : 'CLOSED';

      return tx.returnRequest.update({
        where: { id: returnRequestId },
        data: {
          status: nextStatus,
          inspectionNotes,
        },
        include: {
          items: true,
        },
      });
    });

    await logSecurityAudit('RETURN_INSPECTED', {
      userId: actorUserId,
      role: actorRole,
      status: 'SUCCESS',
      resourceId: returnRequestId,
      reason: `Return inspected. Outcome: ${updated.status}`,
    });

    return updated;
  }

  /**
   * Executes refund for an inspected & approved return request.
   */
  async processReturnRefund(returnRequestId: string, actorUserId?: string, actorRole?: string) {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        items: true,
        suborder: true,
        order: true,
      },
    });

    if (!returnRequest) {
      throw new Error(`Return request not found: ${returnRequestId}`);
    }

    if (returnRequest.status !== 'REFUND_APPROVED' && returnRequest.status !== 'INSPECTED') {
      if (returnRequest.status === 'REFUNDED') {
        throw new Error(`Return request is already refunded (current: ${returnRequest.status})`);
      }
      throw new Error(`Return request is not approved for refund (current: ${returnRequest.status})`);
    }

    // Build items to refund
    const refundItemsToProcess: Array<{ returnItemId: string; quantity: number; amount: Prisma.Decimal }> = [];

    for (const ri of returnRequest.items) {
      const remainingQty = ri.approvedQuantity - ri.refundedQuantity;
      if (remainingQty > 0) {
        const itemUnitPrice = new Prisma.Decimal(ri.unitPrice);
        const itemRefundAmount = itemUnitPrice.times(remainingQty).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        refundItemsToProcess.push({
          returnItemId: ri.id,
          quantity: remainingQty,
          amount: itemRefundAmount,
        });
      }
    }

    if (refundItemsToProcess.length === 0) {
      throw new Error(`No refundable items remaining on return request ${returnRequest.returnNumber}`);
    }

    // Call refundService
    const result = await refundService.executeRefund({
      orderId: returnRequest.orderId,
      suborderId: returnRequest.suborderId,
      sellerId: returnRequest.sellerId,
      returnRequestId: returnRequest.id,
      items: refundItemsToProcess,
      reason: `Return refund for ${returnRequest.returnNumber}: ${returnRequest.reason}`,
      actorUserId,
      actorRole,
    });

    if (!result.success) {
      throw new Error(`Refund failed: ${result.errorMessage}`);
    }

    const updatedReturn = await prisma.returnRequest.findUnique({
      where: { id: returnRequestId },
      include: {
        refunds: {
          include: {
            refundItems: true,
            allocations: true,
          },
        },
        items: true,
      },
    });

    const refund = await prisma.refund.findUnique({
      where: { id: result.refundId },
      include: {
        allocations: true,
        refundItems: true,
      },
    });

    return {
      success: true,
      refund: refund ? { ...refund, gatewayRefundId: refund.providerRefundId } : null,
      returnRequest: updatedReturn,
    };
  }
}

export const returnService = new ReturnService();
