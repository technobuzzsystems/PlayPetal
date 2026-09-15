// ============================================================================
// PHASE 5D: REFUND SERVICE
// Strict Decimal arithmetic, Payment Branching (Razorpay vs COD_MANUAL),
// Multi-seller Allocation Caps, Double-Refund Protection, Compensating Entries
// ============================================================================

import crypto from 'crypto';
import { Prisma, RefundProvider, RefundStatus } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { RazorpayProvider } from '../payment/RazorpayProvider';
import { logSecurityAudit } from '../../utils/security';

export interface ExecuteRefundItemInput {
  returnItemId: string;
  quantity: number;
  amount: Prisma.Decimal;
}

export interface ExecuteRefundInput {
  orderId: string;
  suborderId: string;
  sellerId: string;
  returnRequestId?: string;
  items: ExecuteRefundItemInput[];
  reason: string;
  idempotencyKey?: string;
  actorUserId?: string;
  actorRole?: string;
  notes?: Record<string, string>;
}

export interface ExecuteRefundResult {
  success: boolean;
  refundId?: string;
  refundNumber?: string;
  amount?: Prisma.Decimal;
  provider?: RefundProvider;
  status?: RefundStatus;
  paymentMethod?: string;
  errorMessage?: string;
}

export class RefundService {
  private razorpayProvider: RazorpayProvider;

  constructor() {
    this.razorpayProvider = new RazorpayProvider();
  }

  async generateRefundNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.refund.count();
    let candidate = `RFD-${year}-${String(count + 1).padStart(5, '0')}`;
    const exists = await prisma.refund.findUnique({ where: { refundNumber: candidate } });
    if (exists) {
      const nonce = Math.floor(100 + Math.random() * 900);
      candidate = `RFD-${year}-${Date.now().toString().slice(-6)}${nonce}`;
    }
    return candidate;
  }

  /**
   * Executes refund with complete financial validation, concurrency locks, and compensating ledger updates.
   */
  async executeRefund(input: ExecuteRefundInput): Promise<ExecuteRefundResult> {
    const { orderId, suborderId, sellerId, returnRequestId, items, reason, actorUserId, actorRole } = input;

    // 1. Check Idempotency Key
    const idempotencyKey =
      input.idempotencyKey ||
      `rfd_${orderId}_${suborderId}_${returnRequestId || 'direct'}_${items.map((i) => `${i.returnItemId}:${i.quantity}`).join('-')}`;

    const existingRefund = await prisma.refund.findUnique({
      where: { idempotencyKey },
      include: {
        refundItems: true,
        allocations: true,
      },
    });

    if (existingRefund) {
      return {
        success: true,
        refundId: existingRefund.id,
        refundNumber: existingRefund.refundNumber,
        amount: existingRefund.amount,
        provider: existingRefund.provider,
        status: existingRefund.status,
        paymentMethod: existingRefund.paymentMethod,
      };
    }

    // 2. Fetch Order and Suborder
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return { success: false, errorMessage: `Order not found: ${orderId}` };
    }

    const suborder = await prisma.sellerSuborder.findUnique({
      where: { id: suborderId },
      include: {
        settlement: true,
      },
    });

    if (!suborder || suborder.orderId !== orderId || suborder.sellerId !== sellerId) {
      return { success: false, errorMessage: `Suborder invalid or does not match seller/order.` };
    }

    // 3. Compute Total Refund Amount
    let totalRefundAmount = new Prisma.Decimal(0);
    for (const item of items) {
      if (item.quantity <= 0) {
        return { success: false, errorMessage: `Invalid refund quantity for item ${item.returnItemId}` };
      }
      if (item.amount.lte(0)) {
        return { success: false, errorMessage: `Refund amount must be positive for item ${item.returnItemId}` };
      }
      totalRefundAmount = totalRefundAmount.plus(item.amount);
    }

    totalRefundAmount = totalRefundAmount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    // 4. Suborder Cap Check
    const priorSuborderAllocations = await prisma.refundPaymentAllocation.aggregate({
      where: { suborderId },
      _sum: { allocatedAmount: true },
    });
    const suborderAllocatedSoFar = priorSuborderAllocations._sum.allocatedAmount || new Prisma.Decimal(0);
    const remainingSuborderCap = suborder.totalAmount.minus(suborderAllocatedSoFar);

    if (totalRefundAmount.gt(remainingSuborderCap)) {
      return {
        success: false,
        errorMessage: `Refund amount (₹${totalRefundAmount.toFixed(2)}) exceeds remaining suborder cap (₹${remainingSuborderCap.toFixed(2)})`,
      };
    }

    // 5. Payment Method Branching: ONLINE vs COD_MANUAL
    const isCod =
      order.paymentMethod.toLowerCase().includes('cash') ||
      order.paymentMethod.toLowerCase().includes('cod');

    let refundProvider: RefundProvider;
    let paymentAttemptId: string | null = null;
    let gatewayPaymentId: string | null = null;
    let refundStatus: RefundStatus;
    let providerRefundId: string | null = null;

    if (isCod) {
      // COD Refund Segregation: NEVER touch Razorpay!
      refundProvider = 'COD_MANUAL';
      refundStatus = 'MANUAL_REFUND_COMPLETED';
      providerRefundId = `cod_manual_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    } else {
      // ONLINE Payment: Requires valid captured PaymentAttempt
      refundProvider = 'RAZORPAY';
      const capturedPayment = order.payments.find((p) => p.gatewayPaymentId);

      if (!capturedPayment || !capturedPayment.gatewayPaymentId) {
        return {
          success: false,
          errorMessage: `No successful gateway payment attempt found for online order ${order.orderNumber}. Cannot process online refund.`,
        };
      }

      paymentAttemptId = capturedPayment.id;
      gatewayPaymentId = capturedPayment.gatewayPaymentId;

      // Gateway payment attempt cap check
      const priorPaymentAllocations = await prisma.refundPaymentAllocation.aggregate({
        where: { paymentAttemptId: capturedPayment.id },
        _sum: { allocatedAmount: true },
      });
      const paymentAllocatedSoFar = priorPaymentAllocations._sum.allocatedAmount || new Prisma.Decimal(0);
      const remainingPaymentCap = capturedPayment.amount.minus(paymentAllocatedSoFar);

      if (totalRefundAmount.gt(remainingPaymentCap)) {
        return {
          success: false,
          errorMessage: `Refund amount (₹${totalRefundAmount.toFixed(2)}) exceeds remaining captured gateway amount (₹${remainingPaymentCap.toFixed(2)})`,
        };
      }

      // Execute Razorpay refund via provider with exact integer paise conversion
      const refundResult = await this.razorpayProvider.refundPayment({
        gatewayPaymentId,
        amount: totalRefundAmount,
        currency: 'INR',
        reason,
        receipt: `RFD-${order.orderNumber}-${Date.now()}`,
        notes: {
          orderId,
          suborderId,
          returnRequestId: returnRequestId || 'direct',
        },
      });

      if (refundResult.status === 'FAILED') {
        await logSecurityAudit('REFUND_FAILED', {
          userId: actorUserId,
          role: actorRole,
          status: 'FAILURE',
          reason: refundResult.errorMessage || 'Gateway refund execution rejected',
          resourceId: orderId,
        });
        return {
          success: false,
          errorMessage: refundResult.errorMessage || 'Payment gateway failed to process the refund request.',
        };
      }

      refundStatus = 'COMPLETED';
      providerRefundId = refundResult.gatewayRefundId;
    }

    // 6. Atomic Persistence with Row-level Lock and Compensating Entries
    const refundNumber = await this.generateRefundNumber();

    let createdRefund: any;
    try {
      createdRefund = await prisma.$transaction(async (tx) => {
        // Verify ReturnItems & update refunded quantities
        for (const item of items) {
        // Row-level lock on ReturnItem to prevent concurrent double-refunds
        await tx.$executeRaw`SELECT id FROM "ReturnItem" WHERE id = ${item.returnItemId} FOR UPDATE`;
        const returnItem = await tx.returnItem.findUnique({
          where: { id: item.returnItemId },
        });

        if (!returnItem) {
          throw new Error(`ReturnItem ${item.returnItemId} not found`);
        }

        const remainingRefundableQty = returnItem.approvedQuantity - returnItem.refundedQuantity;
        if (item.quantity > remainingRefundableQty) {
          throw new Error(
            `Double refund prevented for item ${returnItem.id}: requested quantity ${item.quantity} exceeds approved unrefunded quantity ${remainingRefundableQty}`
          );
        }

        // Increment refunded quantity
        await tx.returnItem.update({
          where: { id: item.returnItemId },
          data: {
            refundedQuantity: { increment: item.quantity },
          },
        });
      }

      // Create Refund record
      const rfd = await tx.refund.create({
        data: {
          refundNumber,
          orderId,
          suborderId: undefined, // tracked via allocation
          returnRequestId: returnRequestId || null,
          paymentAttemptId,
          sellerId,
          amount: totalRefundAmount,
          currency: 'INR',
          provider: refundProvider,
          paymentMethod: isCod ? 'COD' : 'ONLINE',
          providerRefundId,
          idempotencyKey,
          status: refundStatus,
          reason,
          processedAt: new Date(),
          metadata: {
            actorUserId,
            actorRole,
            notes: input.notes,
          },
        },
      });

      // Create RefundItem records
      for (const item of items) {
        await tx.refundItem.create({
          data: {
            refundId: rfd.id,
            returnItemId: item.returnItemId,
            quantity: item.quantity,
            amount: item.amount,
            currency: 'INR',
          },
        });
      }

      // Create RefundPaymentAllocation record
      await tx.refundPaymentAllocation.create({
        data: {
          refundId: rfd.id,
          paymentAttemptId,
          suborderId,
          sellerId,
          allocatedAmount: totalRefundAmount,
          currency: 'INR',
        },
      });

      // 7. Compensating Seller Financial Adjustments
      const commissionRate = suborder.settlement
        ? suborder.settlement.commissionRate
        : new Prisma.Decimal(10.0); // Standard 10%

      const commissionReversal = totalRefundAmount
        .times(commissionRate)
        .dividedBy(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      // Post DEBIT: SELLER_ADJUSTMENT for refunded merchandise
      await tx.settlementLedgerEntry.create({
        data: {
          sellerId,
          settlementId: suborder.settlement?.id || null,
          suborderId,
          entryType: 'SELLER_ADJUSTMENT',
          direction: 'DEBIT',
          amount: totalRefundAmount,
          currency: 'INR',
          description: `Compensating debit for refund ${refundNumber} (${returnRequestId ? `return ${returnRequestId}` : 'order return'})`,
          metadata: {
            refundId: rfd.id,
            refundNumber,
            returnRequestId,
          },
        },
      });

      // Post CREDIT: COMMISSION reversal
      await tx.settlementLedgerEntry.create({
        data: {
          sellerId,
          settlementId: suborder.settlement?.id || null,
          suborderId,
          entryType: 'COMMISSION',
          direction: 'CREDIT',
          amount: commissionReversal,
          currency: 'INR',
          description: `Commission reversal credit for refund ${refundNumber}`,
          metadata: {
            refundId: rfd.id,
            refundNumber,
            commissionRate: commissionRate.toString(),
          },
        },
      });

      // Update existing settlement if present
      const currentSettlement = await tx.sellerSettlement.findUnique({
        where: { suborderId },
      });

      if (currentSettlement) {
        const updatedAdjustment = currentSettlement.adjustmentAmount.plus(totalRefundAmount);
        let updatedPayable = currentSettlement.payableAmount;

        if (currentSettlement.payoutStatus !== 'PAID') {
          // Recompute payable amount: net refund deduction is refund minus commission reversal
          const netRefundDebit = totalRefundAmount.minus(commissionReversal);
          const netPayable = currentSettlement.payableAmount.minus(netRefundDebit);
          updatedPayable = Prisma.Decimal.max(new Prisma.Decimal(0), netPayable);
        }

        await tx.sellerSettlement.update({
          where: { id: currentSettlement.id },
          data: {
            adjustmentAmount: updatedAdjustment,
            payableAmount: updatedPayable,
          },
        });
      }

      // If ReturnRequest exists, update its status to REFUNDED
      if (returnRequestId) {
        // Check if all items in the return request are fully refunded
        const allReturnItems = await tx.returnItem.findMany({
          where: { returnRequestId },
        });

        const isFullyRefunded = allReturnItems.every((ri) => ri.refundedQuantity >= ri.approvedQuantity);

        await tx.returnRequest.update({
          where: { id: returnRequestId },
          data: {
            status: isFullyRefunded ? 'REFUNDED' : 'REFUND_APPROVED',
            refundAmount: { increment: totalRefundAmount },
          },
        });
      }

      return rfd;
      });
    } catch (err: any) {
      await logSecurityAudit('REFUND_FAILED', {
        userId: actorUserId,
        role: actorRole,
        status: 'FAILURE',
        reason: err.message,
        resourceId: orderId,
      });
      return {
        success: false,
        errorMessage: err.message,
      };
    }

    // 8. Audit Logging
    await logSecurityAudit('REFUND_EXECUTED', {
      userId: actorUserId,
      role: actorRole,
      status: 'SUCCESS',
      resourceId: createdRefund.id,
      reason: `Refund ${createdRefund.refundNumber} of ₹${totalRefundAmount.toFixed(2)} executed via ${refundProvider}`,
    });

    await logSecurityAudit('REFUND_PROCESSED', {
      userId: actorUserId,
      role: actorRole,
      status: 'SUCCESS',
      resourceId: createdRefund.id,
      reason: `Refund ${createdRefund.refundNumber} processed via ${refundProvider}`,
    });

    return {
      success: true,
      refundId: createdRefund.id,
      refundNumber: createdRefund.refundNumber,
      amount: createdRefund.amount,
      provider: createdRefund.provider,
      status: createdRefund.status,
      paymentMethod: createdRefund.paymentMethod,
    };
  }
}

export const refundService = new RefundService();
