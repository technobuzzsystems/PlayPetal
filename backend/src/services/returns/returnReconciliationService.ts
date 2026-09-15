// ============================================================================
// PHASE 5D: RETURN & REFUND RECONCILIATION SERVICE
// 15-Point Automated Financial and Operational Reconciliation Engine
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { logSecurityAudit } from '../../utils/security';

export interface ReturnReconciliationIssue {
  checkNumber: number;
  checkCode: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  resourceId?: string;
  message: string;
  details?: Record<string, any>;
}

export interface ReturnReconciliationReport {
  timestamp: string;
  totalReturnRequests: number;
  totalRefunds: number;
  totalRefundAmount: string;
  totalChecksExecuted: number;
  passedChecksCount: number;
  failedChecksCount: number;
  status: 'BALANCED' | 'DISCREPANCY';
  issues: ReturnReconciliationIssue[];
  metrics: {
    onlineRefundsCount: number;
    codManualRefundsCount: number;
    onlineRefundsAmount: string;
    codManualRefundsAmount: string;
    reverseShipmentsCount: number;
  };
}

export class ReturnReconciliationService {
  /**
   * Runs the full 15-point reconciliation engine across all returns, refunds, shipments, and ledger entries.
   */
  async runReconciliation(): Promise<ReturnReconciliationReport> {
    const issues: ReturnReconciliationIssue[] = [];

    // Fetch datasets for audit
    const returnRequests = await prisma.returnRequest.findMany({
      include: {
        items: {
          include: {
            orderItem: true,
            refundItems: true,
          },
        },
        shipment: {
          include: {
            trackingEvents: true,
          },
        },
        refunds: {
          include: {
            refundItems: true,
            allocations: true,
          },
        },
        suborder: true,
      },
    });

    const refunds = await prisma.refund.findMany({
      include: {
        refundItems: true,
        allocations: true,
        paymentAttempt: true,
      },
    });

    const suborders = await prisma.sellerSuborder.findMany({
      include: {
        settlement: true,
      },
    });

    const ledgerEntries = await prisma.settlementLedgerEntry.findMany();
    const payouts = await prisma.sellerPayout.findMany();

    // Track metrics
    let onlineCount = 0;
    let codCount = 0;
    let onlineAmount = new Prisma.Decimal(0);
    let codAmount = new Prisma.Decimal(0);
    let totalRefundAmount = new Prisma.Decimal(0);

    for (const r of refunds) {
      totalRefundAmount = totalRefundAmount.plus(r.amount);
      if (r.provider === 'RAZORPAY') {
        onlineCount++;
        onlineAmount = onlineAmount.plus(r.amount);
      } else if (r.provider === 'COD_MANUAL') {
        codCount++;
        codAmount = codAmount.plus(r.amount);
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 1: Return quantity vs original order item quantity
    // -------------------------------------------------------------------------
    for (const ret of returnRequests) {
      for (const item of ret.items) {
        if (item.quantity > item.orderItem.quantity) {
          issues.push({
            checkNumber: 1,
            checkCode: 'RETURN_QTY_EXCEEDS_ORDER_QTY',
            severity: 'CRITICAL',
            resourceId: item.id,
            message: `Return item ${item.id} quantity (${item.quantity}) exceeds original order item quantity (${item.orderItem.quantity})`,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 2: Approved quantity <= requested quantity
    // -------------------------------------------------------------------------
    for (const ret of returnRequests) {
      for (const item of ret.items) {
        if (item.approvedQuantity > item.quantity) {
          issues.push({
            checkNumber: 2,
            checkCode: 'APPROVED_QTY_EXCEEDS_REQUESTED',
            severity: 'CRITICAL',
            resourceId: item.id,
            message: `Return item ${item.id} approved quantity (${item.approvedQuantity}) exceeds requested quantity (${item.quantity})`,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 3: Refunded quantity <= approved quantity (Double-refund check)
    // -------------------------------------------------------------------------
    for (const ret of returnRequests) {
      for (const item of ret.items) {
        if (item.refundedQuantity > item.approvedQuantity) {
          issues.push({
            checkNumber: 3,
            checkCode: 'REFUNDED_QTY_EXCEEDS_APPROVED',
            severity: 'CRITICAL',
            resourceId: item.id,
            message: `Return item ${item.id} refunded quantity (${item.refundedQuantity}) exceeds approved quantity (${item.approvedQuantity})`,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 4: Refund item amount match: sum(RefundItem.amount) === Refund.amount
    // -------------------------------------------------------------------------
    for (const rfd of refunds) {
      if (rfd.refundItems.length > 0) {
        const itemSum = rfd.refundItems.reduce((acc, i) => acc.plus(i.amount), new Prisma.Decimal(0));
        if (!itemSum.equals(rfd.amount)) {
          issues.push({
            checkNumber: 4,
            checkCode: 'REFUND_ITEM_AMOUNT_MISMATCH',
            severity: 'CRITICAL',
            resourceId: rfd.id,
            message: `Refund ${rfd.refundNumber} total amount (₹${rfd.amount}) does not match sum of items (₹${itemSum})`,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 5: Refund allocation match: sum(RefundPaymentAllocation.allocatedAmount) === Refund.amount
    // -------------------------------------------------------------------------
    for (const rfd of refunds) {
      const allocSum = rfd.allocations.reduce((acc, a) => acc.plus(a.allocatedAmount), new Prisma.Decimal(0));
      if (!allocSum.equals(rfd.amount)) {
        issues.push({
          checkNumber: 5,
          checkCode: 'REFUND_ALLOCATION_AMOUNT_MISMATCH',
          severity: 'CRITICAL',
          resourceId: rfd.id,
          message: `Refund ${rfd.refundNumber} amount (₹${rfd.amount}) does not match sum of allocations (₹${allocSum})`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 6: Suborder refund cap: sum(allocations) <= suborder.totalAmount
    // -------------------------------------------------------------------------
    for (const sub of suborders) {
      const subAllocations = await prisma.refundPaymentAllocation.aggregate({
        where: { suborderId: sub.id },
        _sum: { allocatedAmount: true },
      });
      const allocated = subAllocations._sum.allocatedAmount || new Prisma.Decimal(0);
      if (allocated.gt(sub.totalAmount)) {
        issues.push({
          checkNumber: 6,
          checkCode: 'SUBORDER_REFUND_CAP_EXCEEDED',
          severity: 'CRITICAL',
          resourceId: sub.id,
          message: `Suborder ${sub.suborderNumber} has total refunds (₹${allocated}) exceeding suborder total (₹${sub.totalAmount})`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 7: Online payment attempt cap: sum(allocations) <= paymentAttempt.amount
    // -------------------------------------------------------------------------
    const paymentAttempts = await prisma.paymentAttempt.findMany({
      where: { status: 'SUCCESS' },
    });

    for (const pa of paymentAttempts) {
      const paAllocations = await prisma.refundPaymentAllocation.aggregate({
        where: { paymentAttemptId: pa.id },
        _sum: { allocatedAmount: true },
      });
      const allocated = paAllocations._sum.allocatedAmount || new Prisma.Decimal(0);
      if (allocated.gt(pa.amount)) {
        issues.push({
          checkNumber: 7,
          checkCode: 'GATEWAY_PAYMENT_CAP_EXCEEDED',
          severity: 'CRITICAL',
          resourceId: pa.id,
          message: `PaymentAttempt ${pa.id} has total refunds (₹${allocated}) exceeding captured amount (₹${pa.amount})`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 8: COD segregation check: provider === COD_MANUAL => paymentAttemptId === null
    // -------------------------------------------------------------------------
    for (const rfd of refunds) {
      if (rfd.provider === 'COD_MANUAL') {
        if (rfd.paymentAttemptId !== null) {
          issues.push({
            checkNumber: 8,
            checkCode: 'COD_REFUND_HAS_PAYMENT_ATTEMPT',
            severity: 'CRITICAL',
            resourceId: rfd.id,
            message: `COD manual refund ${rfd.refundNumber} erroneously references a gateway PaymentAttempt [${rfd.paymentAttemptId}]`,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 9: Online refund check: provider === RAZORPAY => paymentAttemptId !== null
    // -------------------------------------------------------------------------
    for (const rfd of refunds) {
      if (rfd.provider === 'RAZORPAY') {
        if (!rfd.paymentAttemptId) {
          issues.push({
            checkNumber: 9,
            checkCode: 'ONLINE_REFUND_MISSING_PAYMENT_ATTEMPT',
            severity: 'CRITICAL',
            resourceId: rfd.id,
            message: `Online refund ${rfd.refundNumber} is missing required captured PaymentAttempt reference`,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 10: Compensating debit match: SELLER_ADJUSTMENT DEBIT entry exists for each refund
    // -------------------------------------------------------------------------
    for (const rfd of refunds) {
      const debitEntry = ledgerEntries.find(
        (e) =>
          e.sellerId === rfd.sellerId &&
          e.entryType === 'SELLER_ADJUSTMENT' &&
          e.direction === 'DEBIT' &&
          e.amount.equals(rfd.amount) &&
          (e.metadata as any)?.refundId === rfd.id
      );

      if (!debitEntry) {
        issues.push({
          checkNumber: 10,
          checkCode: 'MISSING_COMPENSATING_DEBIT_LEDGER_ENTRY',
          severity: 'CRITICAL',
          resourceId: rfd.id,
          message: `Refund ${rfd.refundNumber} (₹${rfd.amount}) lacks compensating SELLER_ADJUSTMENT DEBIT entry in financial ledger`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 11: Compensating credit match: COMMISSION CREDIT reversal entry exists
    // -------------------------------------------------------------------------
    for (const rfd of refunds) {
      const commissionCreditEntry = ledgerEntries.find(
        (e) =>
          e.sellerId === rfd.sellerId &&
          e.entryType === 'COMMISSION' &&
          e.direction === 'CREDIT' &&
          (e.metadata as any)?.refundId === rfd.id
      );

      if (!commissionCreditEntry) {
        issues.push({
          checkNumber: 11,
          checkCode: 'MISSING_COMMISSION_REVERSAL_CREDIT_ENTRY',
          severity: 'CRITICAL',
          resourceId: rfd.id,
          message: `Refund ${rfd.refundNumber} lacks corresponding COMMISSION CREDIT reversal entry in financial ledger`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 12: Settlement adjustment sync: adjustmentAmount matches sum of refund debits
    // -------------------------------------------------------------------------
    for (const sub of suborders) {
      if (sub.settlement) {
        const subDebits = ledgerEntries
          .filter((e) => e.suborderId === sub.id && e.entryType === 'SELLER_ADJUSTMENT' && e.direction === 'DEBIT')
          .reduce((sum, e) => sum.plus(e.amount), new Prisma.Decimal(0));

        if (!sub.settlement.adjustmentAmount.equals(subDebits)) {
          issues.push({
            checkNumber: 12,
            checkCode: 'SETTLEMENT_ADJUSTMENT_MISMATCH',
            severity: 'CRITICAL',
            resourceId: sub.settlement.id,
            message: `Settlement ${sub.settlement.id} adjustmentAmount (₹${sub.settlement.adjustmentAmount}) does not match ledger debits (₹${subDebits})`,
          });
        }
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 13: Payout receivable safety: No payout created while ledger balance is negative
    // -------------------------------------------------------------------------
    for (const payout of payouts) {
      // Find all ledger entries for this seller up to payout creation
      const entriesBeforePayout = ledgerEntries.filter(
        (e) => e.sellerId === payout.sellerId && e.createdAt <= payout.createdAt && e.payoutId !== payout.id
      );

      let preCredits = new Prisma.Decimal(0);
      let preDebits = new Prisma.Decimal(0);
      for (const entry of entriesBeforePayout) {
        if (entry.direction === 'CREDIT') preCredits = preCredits.plus(entry.amount);
        else if (entry.direction === 'DEBIT') preDebits = preDebits.plus(entry.amount);
      }

      const preBalance = preCredits.minus(preDebits);
      if (preBalance.lt(0)) {
        issues.push({
          checkNumber: 13,
          checkCode: 'PAYOUT_ON_NEGATIVE_LEDGER_BALANCE',
          severity: 'CRITICAL',
          resourceId: payout.id,
          message: `Payout ${payout.id} was issued when seller ${payout.sellerId} had a negative ledger balance of ₹${preBalance}`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 14: Reverse logistics AWB link: each ReturnShipment is linked to valid ReturnRequest
    // -------------------------------------------------------------------------
    const returnShipments = await prisma.returnShipment.findMany({
      include: { returnRequest: true, trackingEvents: true },
    });

    let reverseShipmentsCount = returnShipments.length;

    for (const rs of returnShipments) {
      if (!rs.returnRequest) {
        issues.push({
          checkNumber: 14,
          checkCode: 'ORPHANED_RETURN_SHIPMENT',
          severity: 'CRITICAL',
          resourceId: rs.id,
          message: `Return shipment ${rs.id} is orphaned without an associated ReturnRequest`,
        });
      }
      if (!rs.awbNumber) {
        issues.push({
          checkNumber: 14,
          checkCode: 'RETURN_SHIPMENT_MISSING_AWB',
          severity: 'WARNING',
          resourceId: rs.id,
          message: `Return shipment ${rs.id} does not have an assigned AWB number`,
        });
      }
    }

    // -------------------------------------------------------------------------
    // CHECK 15: Idempotency uniqueness and format integrity
    // -------------------------------------------------------------------------
    const refundKeys = new Set<string>();
    for (const rfd of refunds) {
      if (refundKeys.has(rfd.idempotencyKey)) {
        issues.push({
          checkNumber: 15,
          checkCode: 'DUPLICATE_REFUND_IDEMPOTENCY_KEY',
          severity: 'CRITICAL',
          resourceId: rfd.id,
          message: `Duplicate refund idempotency key: ${rfd.idempotencyKey}`,
        });
      }
      refundKeys.add(rfd.idempotencyKey);
    }

    const returnNumbers = new Set<string>();
    for (const ret of returnRequests) {
      if (returnNumbers.has(ret.returnNumber)) {
        issues.push({
          checkNumber: 15,
          checkCode: 'DUPLICATE_RETURN_NUMBER',
          severity: 'CRITICAL',
          resourceId: ret.id,
          message: `Duplicate return number: ${ret.returnNumber}`,
        });
      }
      returnNumbers.add(ret.returnNumber);
    }

    const totalChecksExecuted = 15;
    const failedChecksCount = new Set(issues.map((i) => i.checkNumber)).size;
    const passedChecksCount = totalChecksExecuted - failedChecksCount;

    const report: ReturnReconciliationReport = {
      timestamp: new Date().toISOString(),
      totalReturnRequests: returnRequests.length,
      totalRefunds: refunds.length,
      totalRefundAmount: totalRefundAmount.toFixed(2),
      totalChecksExecuted,
      passedChecksCount,
      failedChecksCount,
      status: issues.length === 0 ? 'BALANCED' : 'DISCREPANCY',
      issues,
      metrics: {
        onlineRefundsCount: onlineCount,
        codManualRefundsCount: codCount,
        onlineRefundsAmount: onlineAmount.toFixed(2),
        codManualRefundsAmount: codAmount.toFixed(2),
        reverseShipmentsCount,
      },
    };

    await logSecurityAudit('REFUND_RECONCILIATION_RUN', {
      status: issues.length === 0 ? 'SUCCESS' : 'WARNING',
      reason: `Return/Refund reconciliation completed with ${passedChecksCount}/15 checks passed`,
    });

    return report;
  }
}

export const returnReconciliationService = new ReturnReconciliationService();
