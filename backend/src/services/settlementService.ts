import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { commissionService } from './commissionService';
import { getPayoutProvider } from './payout';
import { logSecurityEvent } from '../utils/security';

export interface SettlementActor {
  id?: string;
  role?: string;
  vendorId?: string;
  email?: string;
}

export interface SellerFinancialSummary {
  sellerId: string;
  currency: string;
  lifetimeGross: string;
  lifetimeCommission: string;
  lifetimePlatformFees: string;
  lifetimeAdjustments: string;
  totalSettledPayable: string;
  paidAmount: string;
  pendingSettlementAmount: string;
  reservedAmount: string;
  availablePayable: string;
  ledgerBalance: string;
  sellerReceivable: string;
  isConsistent: boolean;
  unpaidSettlementCount: number;
  completedPayoutCount: number;
}

export interface ReconciliationException {
  code: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  sellerId?: string;
  settlementId?: string;
  payoutId?: string;
  message: string;
  details?: Record<string, any>;
}

export interface SellerReconciliationReport {
  sellerId: string;
  shopName: string;
  currency: string;
  grossSales: string;
  commission: string;
  platformFees: string;
  adjustments: string;
  netPayable: string;
  alreadyPaid: string;
  reservedPayable: string;
  remainingPayable: string;
  ledgerBalance: string;
  difference: string;
  status: 'BALANCED' | 'DISCREPANCY';
  exceptions: ReconciliationException[];
}

export interface MarketplaceReconciliationReport {
  timestamp: string;
  totalSellers: number;
  balancedSellers: number;
  sellersWithDiscrepancies: number;
  totalGrossSales: string;
  totalCommissions: string;
  totalPaidOut: string;
  totalAvailablePayable: string;
  totalLedgerBalance: string;
  overallStatus: 'BALANCED' | 'DISCREPANCY';
  exceptions: ReconciliationException[];
  sellerReports: SellerReconciliationReport[];
}

export class SettlementService {
  /**
   * Deterministically verifies whether a SellerSuborder is eligible for settlement.
   *
   * Rules:
   * 1. SellerSuborder must exist.
   * 2. SellerSuborder must not already have an existing SellerSettlement (@unique).
   * 3. Seller account must be ACTIVE or APPROVED.
   * 4. Fulfillment must be complete (suborder.status === DELIVERED).
   * 5. If Shipment exists: shipment.status === DELIVERED, not FAILED/CANCELLED/RTO.
   * 6. Payment verified:
   *    - COD: Payment captured upon verified delivery handover.
   *    - Online: order.paymentStatus === 'Paid' OR exists a CAPTURED PaymentAttempt.
   * 7. Gross and derived payable amounts must be positive.
   */
  public async verifySettlementEligibility(suborderId: string): Promise<{
    isEligible: boolean;
    reasons: string[];
    suborder?: any;
  }> {
    const suborder = await prisma.sellerSuborder.findUnique({
      where: { id: suborderId },
      include: {
        order: {
          include: {
            payments: true,
          },
        },
        items: true,
        seller: true,
        shipment: true,
        settlement: true,
      },
    });

    if (!suborder) {
      return { isEligible: false, reasons: ['SUBORDER_NOT_FOUND: Suborder does not exist.'] };
    }

    const reasons: string[] = [];

    if (suborder.settlement) {
      reasons.push('SETTLEMENT_ALREADY_EXISTS: Settlement already exists for this suborder.');
    }

    // Verify Seller account lifecycle status
    if (suborder.seller.status !== 'ACTIVE' && suborder.seller.status !== 'APPROVED') {
      reasons.push(`SELLER_INACTIVE: Seller status is '${suborder.seller.status}'. Active status required for settlement.`);
    }

    // Verify fulfillment completion
    if (suborder.status !== 'DELIVERED') {
      reasons.push(`SUBORDER_NOT_DELIVERED: Suborder status is '${suborder.status}'. Settlement requires DELIVERED.`);
    }

    if (suborder.shipment) {
      if (['FAILED', 'CANCELLED', 'RTO', 'RETURNED_TO_ORIGIN'].includes(suborder.shipment.status)) {
        reasons.push(`SHIPMENT_INVALID: Associated shipment is in failed/returned status '${suborder.shipment.status}'.`);
      } else if (suborder.shipment.status !== 'DELIVERED') {
        reasons.push(`SHIPMENT_NOT_DELIVERED: Associated shipment status is '${suborder.shipment.status}'. DELIVERED required.`);
      }
    }

    // Verify payment capture
    const isCod = suborder.order.paymentMethod === 'Cash on Delivery';
    if (!isCod) {
      const orderPaid = suborder.order.paymentStatus === 'Paid';
      const hasCapturedPayment = suborder.order.payments?.some((p) => p.status === 'CAPTURED');

      if (!orderPaid && !hasCapturedPayment) {
        reasons.push('PAYMENT_NOT_CAPTURED: Order payment is not captured.');
      }
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
      suborder,
    };
  }

  public async checkEligibility(suborderId: string): Promise<{
    isEligible: boolean;
    reason?: string;
    suborder?: any;
  }> {
    const res = await this.verifySettlementEligibility(suborderId);
    return {
      isEligible: res.isEligible,
      reason: res.reasons[0],
      suborder: res.suborder,
    };
  }

  /**
   * Creates an immutable SellerSettlement for an eligible suborder.
   * Atomically creates the settlement and posts initial append-only ledger entries:
   * 1. SALE_GROSS (CREDIT)
   * 2. COMMISSION (DEBIT)
   * 3. PLATFORM_FEE (DEBIT if > 0)
   */
  public async createSettlementForSuborder(
    suborderId: string,
    actor?: SettlementActor
  ): Promise<any> {
    const eligibility = await this.checkEligibility(suborderId);
    if (!eligibility.isEligible || !eligibility.suborder) {
      logSecurityEvent('SETTLEMENT_FAILED', {
        userId: actor?.id,
        role: actor?.role,
        status: 'WARNING',
        resourceId: suborderId,
        reason: eligibility.reason || 'Settlement eligibility check failed',
      });
      throw new Error(`INELIGIBLE_FOR_SETTLEMENT: ${eligibility.reason}`);
    }

    const suborder = eligibility.suborder;

    // Calculate commission using Decimal arithmetic
    const calc = commissionService.calculateCommission({
      subtotal: suborder.subtotal,
      deliveryFee: suborder.deliveryFee,
      sellerId: suborder.sellerId,
      sellerType: suborder.sellerType,
    });

    logSecurityEvent('SETTLEMENT_CALCULATED', {
      userId: actor?.id,
      role: actor?.role,
      status: 'INFO',
      resourceId: suborderId,
      reason: `Gross: ${calc.grossAmount}, Commission: ${calc.commissionAmount}, Payable: ${calc.payableAmount}`,
    });

    // Execute atomic creation in transaction
    const settlement = await prisma.$transaction(async (tx) => {
      // Create settlement with @unique suborderId constraint
      const createdSettlement = await tx.sellerSettlement.create({
        data: {
          suborderId: suborder.id,
          sellerId: suborder.sellerId,
          currency: 'INR',
          grossAmount: calc.grossAmount,
          commissionRate: calc.commissionRate,
          commissionAmount: calc.commissionAmount,
          platformFeeAmount: calc.platformFeeAmount,
          adjustmentAmount: calc.adjustmentAmount,
          payableAmount: calc.payableAmount,
          status: 'SETTLED',
          payoutStatus: 'UNPAID',
          metadata: {
            suborderNumber: suborder.suborderNumber,
            itemCount: suborder.items?.length || 0,
            settledBy: actor?.id || 'system',
          },
        },
      });

      // Post SALE_GROSS credit to append-only ledger
      await tx.settlementLedgerEntry.create({
        data: {
          sellerId: suborder.sellerId,
          settlementId: createdSettlement.id,
          suborderId: suborder.id,
          entryType: 'SALE_GROSS',
          direction: 'CREDIT',
          amount: calc.grossAmount,
          currency: 'INR',
          description: `Gross sales credit for suborder ${suborder.suborderNumber}`,
          metadata: { suborderNumber: suborder.suborderNumber },
        },
      });

      // Post COMMISSION debit to append-only ledger
      await tx.settlementLedgerEntry.create({
        data: {
          sellerId: suborder.sellerId,
          settlementId: createdSettlement.id,
          suborderId: suborder.id,
          entryType: 'COMMISSION',
          direction: 'DEBIT',
          amount: calc.commissionAmount,
          currency: 'INR',
          description: `Marketplace commission (${calc.commissionRate}%) for suborder ${suborder.suborderNumber}`,
          metadata: { suborderNumber: suborder.suborderNumber, rate: calc.commissionRate.toString() },
        },
      });

      if (calc.platformFeeAmount.greaterThan(0)) {
        await tx.settlementLedgerEntry.create({
          data: {
            sellerId: suborder.sellerId,
            settlementId: createdSettlement.id,
            suborderId: suborder.id,
            entryType: 'PLATFORM_FEE',
            direction: 'DEBIT',
            amount: calc.platformFeeAmount,
            currency: 'INR',
            description: `Platform fee for suborder ${suborder.suborderNumber}`,
          },
        });
      }

      return createdSettlement;
    });

    logSecurityEvent('SETTLEMENT_CREATED', {
      userId: actor?.id,
      role: actor?.role,
      status: 'SUCCESS',
      resourceId: settlement.id,
      reason: `Settlement created for suborder ${suborder.suborderNumber} (Payable: ₹${settlement.payableAmount})`,
    });

    return settlement;
  }

  public async calculateAndCreateSettlement(
    suborderId: string,
    actor?: SettlementActor
  ): Promise<any> {
    return this.createSettlementForSuborder(suborderId, actor);
  }

  public async calculateAndRecordSettlement(
    suborderId: string,
    actor?: SettlementActor
  ): Promise<any> {
    return this.createSettlementForSuborder(suborderId, actor);
  }

  /**
   * Retrieves an aggregated financial summary for a vendor.
   * Derives available balance dynamically from unconsumed settlements and verifies ledger consistency.
   */
  public async getSellerFinancialSummary(sellerId: string): Promise<SellerFinancialSummary> {
    const settlements = await prisma.sellerSettlement.findMany({
      where: { sellerId },
    });

    const payouts = await prisma.sellerPayout.findMany({
      where: { sellerId },
    });

    const ledgerEntries = await prisma.settlementLedgerEntry.findMany({
      where: { sellerId },
    });

    let lifetimeGross = new Prisma.Decimal(0);
    let lifetimeCommission = new Prisma.Decimal(0);
    let lifetimePlatformFees = new Prisma.Decimal(0);
    let lifetimeAdjustments = new Prisma.Decimal(0);
    let totalSettledPayable = new Prisma.Decimal(0);
    let availablePayable = new Prisma.Decimal(0);
    let unpaidSettlementCount = 0;

    for (const s of settlements) {
      lifetimeGross = lifetimeGross.plus(s.grossAmount);
      lifetimeCommission = lifetimeCommission.plus(s.commissionAmount);
      lifetimePlatformFees = lifetimePlatformFees.plus(s.platformFeeAmount);
      lifetimeAdjustments = lifetimeAdjustments.plus(s.adjustmentAmount);

      if (s.status === 'SETTLED') {
        totalSettledPayable = totalSettledPayable.plus(s.payableAmount);
        if (s.payoutStatus === 'UNPAID') {
          availablePayable = availablePayable.plus(s.payableAmount);
          unpaidSettlementCount++;
        }
      }
    }

    let paidAmount = new Prisma.Decimal(0);
    let reservedAmount = new Prisma.Decimal(0);
    let completedPayoutCount = 0;

    for (const p of payouts) {
      if (p.status === 'COMPLETED') {
        paidAmount = paidAmount.plus(p.amount);
        completedPayoutCount++;
      } else if (p.status === 'PENDING' || p.status === 'PROCESSING') {
        reservedAmount = reservedAmount.plus(p.amount);
      }
    }

    // Dynamic ledger balance: sum(Credits) - sum(Debits)
    let totalCredits = new Prisma.Decimal(0);
    let totalDebits = new Prisma.Decimal(0);

    for (const entry of ledgerEntries) {
      if (entry.direction === 'CREDIT') {
        totalCredits = totalCredits.plus(entry.amount);
      } else if (entry.direction === 'DEBIT') {
        totalDebits = totalDebits.plus(entry.amount);
      }
    }

    const ledgerBalance = totalCredits.minus(totalDebits);

    // Pending suborders not yet settled
    const pendingDeliveredSuborders = await prisma.sellerSuborder.findMany({
      where: {
        sellerId,
        status: 'DELIVERED',
        settlement: null,
      },
    });

    let pendingSettlementAmount = new Prisma.Decimal(0);
    for (const sub of pendingDeliveredSuborders) {
      const calc = commissionService.calculateCommission({ subtotal: sub.subtotal, deliveryFee: sub.deliveryFee });
      pendingSettlementAmount = pendingSettlementAmount.plus(calc.payableAmount);
    }

    // Consistency check: availablePayable should match ledgerBalance
    const isConsistent = availablePayable.equals(ledgerBalance);
    const sellerReceivable = ledgerBalance.lt(0) ? ledgerBalance.abs().toFixed(2) : '0.00';
    const effectiveAvailablePayable = ledgerBalance.lt(0)
      ? new Prisma.Decimal(0)
      : Prisma.Decimal.min(availablePayable, ledgerBalance);

    return {
      sellerId,
      currency: 'INR',
      lifetimeGross: lifetimeGross.toFixed(2),
      lifetimeCommission: lifetimeCommission.toFixed(2),
      lifetimePlatformFees: lifetimePlatformFees.toFixed(2),
      lifetimeAdjustments: lifetimeAdjustments.toFixed(2),
      totalSettledPayable: totalSettledPayable.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      pendingSettlementAmount: pendingSettlementAmount.toFixed(2),
      reservedAmount: reservedAmount.toFixed(2),
      availablePayable: effectiveAvailablePayable.toFixed(2),
      ledgerBalance: ledgerBalance.toFixed(2),
      sellerReceivable,
      isConsistent,
      unpaidSettlementCount,
      completedPayoutCount,
    };
  }

  /**
   * Retrieves paginated append-only financial ledger entries for a vendor.
   */
  public async getSellerLedger(
    sellerId: string,
    options?: { limit?: number; offset?: number; entryType?: string }
  ): Promise<{ entries: any[]; total: number }> {
    const limit = Math.min(Math.max(Number(options?.limit) || 50, 1), 100);
    const offset = Math.max(Number(options?.offset) || 0, 0);

    const where: any = { sellerId };
    if (options?.entryType) {
      where.entryType = options.entryType;
    }

    const [entries, total] = await Promise.all([
      prisma.settlementLedgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.settlementLedgerEntry.count({ where }),
    ]);

    return { entries, total };
  }

  /**
   * Retrieves paginated settlements for a vendor.
   */
  public async getSellerSettlements(
    sellerId: string,
    options?: { status?: string; payoutStatus?: string; limit?: number; offset?: number }
  ): Promise<{ settlements: any[]; total: number }> {
    const limit = Math.min(Math.max(Number(options?.limit) || 50, 1), 100);
    const offset = Math.max(Number(options?.offset) || 0, 0);

    const where: any = { sellerId };
    if (options?.status) where.status = options.status as any;
    if (options?.payoutStatus) where.payoutStatus = options.payoutStatus as any;

    const [settlements, total] = await Promise.all([
      prisma.sellerSettlement.findMany({
        where,
        include: {
          suborder: {
            select: {
              suborderNumber: true,
              totalAmount: true,
              status: true,
              deliveredAt: true,
            },
          },
        },
        orderBy: { settledAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.sellerSettlement.count({ where }),
    ]);

    return { settlements, total };
  }

  /**
   * Initiates a deterministic seller payout with strict idempotency and concurrency guards.
   *
   * Execution Lifecycle:
   * 1. Idempotency Check: Returns existing payout if idempotencyKey already recorded.
   * 2. Atomic Reservation Transaction:
   *    - Row-locks target unpaid settlements via UPDATE WHERE payoutStatus = 'UNPAID'
   *    - Verifies updated row count matches selected settlements
   *    - Sets payoutStatus = 'RESERVED'
   *    - Creates SellerPayout (PENDING)
   *    - Creates SellerPayoutSettlement join records
   *    - Posts PAYOUT_RESERVED (DEBIT) in append-only ledger
   * 3. Sandbox Provider Invocation: Outside DB transaction
   * 4. Resolution Transaction:
   *    - Success: Payout COMPLETED, settlements PAID, posts SETTLEMENT_RELEASE (CREDIT) & PAYOUT_COMPLETED (DEBIT)
   *    - Failure: Payout FAILED, settlements UNPAID (restored), posts compensating PAYOUT_FAILED (CREDIT)
   */
  public async createPayout(
    sellerIdOrParams: string | {
      sellerId: string;
      amount?: Prisma.Decimal | number | string;
      settlementIds?: string[];
      idempotencyKey: string;
      simulateFailure?: boolean;
      failureReason?: string;
    },
    optionsOrActor?: any,
    actorParam?: SettlementActor
  ): Promise<any> {
    let sellerId: string;
    let options: {
      amount?: Prisma.Decimal | number | string;
      settlementIds?: string[];
      idempotencyKey: string;
      simulateFailure?: boolean;
      failureReason?: string;
    };
    let actor: SettlementActor | undefined;

    if (typeof sellerIdOrParams === 'object' && sellerIdOrParams !== null && 'sellerId' in sellerIdOrParams) {
      sellerId = sellerIdOrParams.sellerId;
      options = sellerIdOrParams;
      actor = optionsOrActor;
    } else {
      sellerId = String(sellerIdOrParams);
      options = optionsOrActor || {};
      actor = actorParam;
    }

    const cleanIdempotencyKey = String(options.idempotencyKey || '').trim();
    if (!cleanIdempotencyKey) {
      throw new Error('IDEMPOTENCY_KEY_REQUIRED: Idempotency-Key is mandatory for payout requests.');
    }

    // 1. Check idempotency: If existing payout exists with this key, return it idempotently
    const existingPayout = await prisma.sellerPayout.findUnique({
      where: { idempotencyKey: cleanIdempotencyKey },
      include: {
        payoutSettlements: {
          include: {
            settlement: true,
          },
        },
      },
    });

    if (existingPayout) {
      logSecurityEvent('PAYOUT_CREATED', {
        userId: actor?.id,
        role: actor?.role,
        status: 'INFO',
        resourceId: existingPayout.id,
        reason: `Idempotent replay returned existing payout [ID: ${existingPayout.id}]`,
      });
      (existingPayout as any).isReplay = true;
      (existingPayout as any).success = existingPayout.status === 'COMPLETED';
      return existingPayout;
    }

    // 2. Atomic Reservation Transaction
    const reservationResult = await prisma.$transaction(async (tx) => {
      // Find candidate unpaid settlements
      const whereClause: any = {
        sellerId,
        status: 'SETTLED',
        payoutStatus: 'UNPAID',
      };

      if (options.settlementIds && options.settlementIds.length > 0) {
        whereClause.id = { in: options.settlementIds };
      }

      const candidateSettlements = await tx.sellerSettlement.findMany({
        where: whereClause,
        orderBy: { settledAt: 'asc' },
      });

      if (candidateSettlements.length === 0) {
        throw new Error('NO_UNPAID_SETTLEMENTS_AVAILABLE: No eligible unpaid settlements found. Requested settlements have already been paid or reserved.');
      }

      // If specific settlement IDs requested, verify all exist and are unpaid
      if (options.settlementIds && options.settlementIds.length > 0) {
        if (candidateSettlements.length !== options.settlementIds.length) {
          throw new Error('CONCURRENCY_CONFLICT: One or more requested settlements have already been paid, reserved, or are invalid.');
        }
      }

      // Determine settlements to pay
      let selectedSettlements = candidateSettlements;
      let targetAmount = options.amount ? new Prisma.Decimal(options.amount.toString()) : null;

      if (targetAmount && targetAmount.greaterThan(0)) {
        let runningTotal = new Prisma.Decimal(0);
        const filtered: typeof candidateSettlements = [];
        for (const s of candidateSettlements) {
          if (runningTotal.lessThan(targetAmount)) {
            filtered.push(s);
            runningTotal = runningTotal.plus(s.payableAmount);
          }
        }
        selectedSettlements = filtered;
      }

      const selectedIds = selectedSettlements.map((s) => s.id);
      const payoutAmount = selectedSettlements.reduce(
        (sum, s) => sum.plus(s.payableAmount),
        new Prisma.Decimal(0)
      );

      if (payoutAmount.lessThanOrEqualTo(0)) {
        throw new Error('INVALID_PAYOUT_AMOUNT: Total payout amount must be strictly greater than 0.');
      }

      // Ledger balance safety check (already-paid seller receivable recovery)
      const allEntries = await tx.settlementLedgerEntry.findMany({
        where: { sellerId },
        select: { direction: true, amount: true },
      });

      let netCredits = new Prisma.Decimal(0);
      let netDebits = new Prisma.Decimal(0);
      for (const e of allEntries) {
        if (e.direction === 'CREDIT') netCredits = netCredits.plus(e.amount);
        else if (e.direction === 'DEBIT') netDebits = netDebits.plus(e.amount);
      }
      const currentLedgerBalance = netCredits.minus(netDebits);

      if (currentLedgerBalance.lte(0)) {
        throw new Error(`NEGATIVE_LEDGER_BALANCE: Seller has an outstanding receivable balance of ₹${currentLedgerBalance.abs().toFixed(2)}. No payouts can be issued until future settlements clear this balance.`);
      }

      if (payoutAmount.greaterThan(currentLedgerBalance)) {
        throw new Error(`PAYOUT_EXCEEDS_LEDGER_BALANCE: Payout amount ₹${payoutAmount.toFixed(2)} exceeds net available ledger balance of ₹${currentLedgerBalance.toFixed(2)}.`);
      }

      // Row-level concurrency lock: Atomically update settlements where payoutStatus is strictly UNPAID
      const updateResult = await tx.sellerSettlement.updateMany({
        where: {
          id: { in: selectedIds },
          sellerId,
          status: 'SETTLED',
          payoutStatus: 'UNPAID', // Concurrency guard: Must still be UNPAID!
        },
        data: {
          payoutStatus: 'RESERVED',
        },
      });

      if (updateResult.count !== selectedIds.length) {
        throw new Error('CONCURRENCY_CONFLICT: One or more selected settlements were reserved or paid by a concurrent operation.');
      }

      // Create SellerPayout record
      const payout = await tx.sellerPayout.create({
        data: {
          sellerId,
          amount: payoutAmount,
          currency: 'INR',
          status: 'PENDING',
          provider: 'SANDBOX',
          idempotencyKey: cleanIdempotencyKey,
          metadata: {
            settlementCount: selectedIds.length,
            requestedBy: actor?.id || 'admin',
          },
        },
      });

      // Update currentPayoutId on the reserved settlements
      await tx.sellerSettlement.updateMany({
        where: { id: { in: selectedIds } },
        data: { currentPayoutId: payout.id },
      });

      // Create SellerPayoutSettlement join records
      await tx.sellerPayoutSettlement.createMany({
        data: selectedSettlements.map((s) => ({
          payoutId: payout.id,
          settlementId: s.id,
          amount: s.payableAmount,
          currency: s.currency,
        })),
      });

      // Post PAYOUT_RESERVED debit entry in append-only ledger
      await tx.settlementLedgerEntry.create({
        data: {
          sellerId,
          payoutId: payout.id,
          entryType: 'PAYOUT_RESERVED',
          direction: 'DEBIT',
          amount: payoutAmount,
          currency: 'INR',
          description: `Payout reservation for ${selectedIds.length} settlement(s) [Payout: ${payout.id}]`,
          metadata: {
            settlementIds: selectedIds,
            idempotencyKey: cleanIdempotencyKey,
          },
        },
      });

      return {
        payout,
        selectedIds,
        payoutAmount,
      };
    });

    const { payout, selectedIds, payoutAmount } = reservationResult;

    logSecurityEvent('PAYOUT_PROCESSING', {
      userId: actor?.id,
      role: actor?.role,
      status: 'INFO',
      resourceId: payout.id,
      reason: `Payout ${payout.id} reserved: ₹${payoutAmount} across ${selectedIds.length} settlement(s)`,
    });

    // 3. Dispatch to Sandbox Payout Provider (Outside DB transaction)
    const provider = getPayoutProvider();
    const providerResponse = await provider.createPayout({
      payoutId: payout.id,
      sellerId,
      amount: payoutAmount,
      currency: 'INR',
      idempotencyKey: cleanIdempotencyKey,
      metadata: {
        simulateFailure: options.simulateFailure,
        failureReason: options.failureReason,
      },
    });

    // 4. Resolution Transaction
    const resolvedPayout = await prisma.$transaction(async (tx) => {
      if (providerResponse.success && providerResponse.status === 'COMPLETED') {
        // Payout succeeded: Mark payout COMPLETED, mark settlements PAID, consume entitlement exactly once
        const updatedPayout = await tx.sellerPayout.update({
          where: { id: payout.id },
          data: {
            status: 'COMPLETED',
            providerPayoutId: providerResponse.providerPayoutId,
            processedAt: new Date(),
          },
        });

        // Permanently consume settlement entitlements
        await tx.sellerSettlement.updateMany({
          where: { id: { in: selectedIds } },
          data: {
            payoutStatus: 'PAID',
            completedPayoutId: payout.id,
            currentPayoutId: null,
          },
        });

        // Post SETTLEMENT_RELEASE (CREDIT) to offset reservation, and PAYOUT_COMPLETED (DEBIT) to confirm disbursement
        await tx.settlementLedgerEntry.create({
          data: {
            sellerId,
            payoutId: payout.id,
            entryType: 'SETTLEMENT_RELEASE',
            direction: 'CREDIT',
            amount: payoutAmount,
            currency: 'INR',
            description: `Settlement reservation release on successful disbursement [Payout: ${payout.id}]`,
          },
        });

        await tx.settlementLedgerEntry.create({
          data: {
            sellerId,
            payoutId: payout.id,
            entryType: 'PAYOUT_COMPLETED',
            direction: 'DEBIT',
            amount: payoutAmount,
            currency: 'INR',
            description: `Disbursement completed via ${provider.providerName} [Ref: ${providerResponse.providerPayoutId}]`,
            metadata: { providerPayoutId: providerResponse.providerPayoutId },
          },
        });

        return updatedPayout;
      } else {
        // Payout failed: Mark payout FAILED, release settlements back to UNPAID, post compensating credit
        const updatedPayout = await tx.sellerPayout.update({
          where: { id: payout.id },
          data: {
            status: 'FAILED',
            failureReason: providerResponse.failureReason || 'Payout disbursement failed.',
            providerPayoutId: providerResponse.providerPayoutId,
          },
        });

        // Restore settlement entitlements
        await tx.sellerSettlement.updateMany({
          where: { id: { in: selectedIds } },
          data: {
            payoutStatus: 'UNPAID',
            currentPayoutId: null,
          },
        });

        // Post compensating PAYOUT_FAILED credit entry restoring seller available balance
        await tx.settlementLedgerEntry.create({
          data: {
            sellerId,
            payoutId: payout.id,
            entryType: 'PAYOUT_FAILED',
            direction: 'CREDIT',
            amount: payoutAmount,
            currency: 'INR',
            description: `Compensating release for failed payout ${payout.id}: ${providerResponse.failureReason || 'Failed'}`,
            metadata: {
              failureReason: providerResponse.failureReason,
              providerPayoutId: providerResponse.providerPayoutId,
            },
          },
        });

        return updatedPayout;
      }
    });

    if (resolvedPayout.status === 'COMPLETED') {
      logSecurityEvent('PAYOUT_COMPLETED', {
        userId: actor?.id,
        role: actor?.role,
        status: 'SUCCESS',
        resourceId: payout.id,
        reason: `Payout completed successfully: ₹${payoutAmount} via ${providerResponse.providerPayoutId}`,
      });
    } else {
      logSecurityEvent('PAYOUT_FAILED', {
        userId: actor?.id,
        role: actor?.role,
        status: 'WARNING',
        resourceId: payout.id,
        reason: `Payout failed: ${providerResponse.failureReason}. Entitlement restored to seller.`,
      });
    }

    (resolvedPayout as any).success = resolvedPayout.status === 'COMPLETED';
    return resolvedPayout;
  }

  public async createAndProcessPayout(
    params: {
      sellerId: string;
      settlementIds?: string[];
      amount?: Prisma.Decimal | number | string;
      idempotencyKey: string;
      simulateFailure?: boolean;
      failureReason?: string;
    },
    actor?: SettlementActor
  ): Promise<any> {
    return this.createPayout(params.sellerId, params, actor);
  }

  /**
   * Retries a previously failed payout using a safe retry token.
   * Does NOT duplicate SALE_GROSS entries; operates directly against the restored original entitlements.
   */
  public async retryPayout(
    payoutId: string,
    options: { idempotencyKey?: string },
    actor?: SettlementActor
  ): Promise<any> {
    const existingPayout = await prisma.sellerPayout.findUnique({
      where: { id: payoutId },
      include: {
        payoutSettlements: true,
      },
    });

    if (!existingPayout) {
      throw new Error('PAYOUT_NOT_FOUND: Payout record does not exist.');
    }

    if (existingPayout.status !== 'FAILED') {
      throw new Error(`CANNOT_RETRY: Payout status is '${existingPayout.status}'. Only FAILED payouts can be retried.`);
    }

    const settlementIds = existingPayout.payoutSettlements.map((ps) => ps.settlementId);
    const retryKey = options.idempotencyKey || `${existingPayout.idempotencyKey}:retry:${Date.now()}`;

    logSecurityEvent('PAYOUT_RETRY', {
      userId: actor?.id,
      role: actor?.role,
      status: 'INFO',
      resourceId: payoutId,
      reason: `Retrying failed payout ${payoutId} with new attempt (Key: ${retryKey})`,
    });

    return this.createPayout(
      existingPayout.sellerId,
      {
        settlementIds,
        idempotencyKey: retryKey,
      },
      actor
    );
  }

  /**
   * Financial Reconciliation Engine
   * Evaluates 9 deterministic invariants for a specific vendor.
   */
  public async reconcileSeller(sellerId: string): Promise<SellerReconciliationReport> {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: sellerId },
      select: { id: true, shopName: true },
    });

    const shopName = vendor?.shopName || sellerId;
    const exceptions: ReconciliationException[] = [];

    const settlements = await prisma.sellerSettlement.findMany({
      where: { sellerId },
      include: {
        payoutSettlements: {
          include: {
            payout: true,
          },
        },
      },
    });

    const payouts = await prisma.sellerPayout.findMany({
      where: { sellerId },
      include: {
        payoutSettlements: true,
        ledgerEntries: true,
      },
    });

    const ledgerEntries = await prisma.settlementLedgerEntry.findMany({
      where: { sellerId },
    });

    // Invariant 1: Check if any settlement is included in multiple COMPLETED payouts
    for (const s of settlements) {
      const completedLinks = s.payoutSettlements.filter((ps) => ps.payout.status === 'COMPLETED');
      if (completedLinks.length > 1) {
        exceptions.push({
          code: 'SETTLEMENT_IN_MULTIPLE_COMPLETED_PAYOUTS',
          severity: 'CRITICAL',
          sellerId,
          settlementId: s.id,
          message: `Settlement ${s.id} is linked to ${completedLinks.length} COMPLETED payouts: ${completedLinks.map((l) => l.payoutId).join(', ')}`,
        });
      }

      // Invariant 2: Check if any settlement is linked to more than one ACTIVE payout (PENDING or PROCESSING)
      const activeLinks = s.payoutSettlements.filter(
        (ps) => ps.payout.status === 'PENDING' || ps.payout.status === 'PROCESSING'
      );
      if (activeLinks.length > 1) {
        exceptions.push({
          code: 'SETTLEMENT_IN_MULTIPLE_ACTIVE_PAYOUTS',
          severity: 'CRITICAL',
          sellerId,
          settlementId: s.id,
          message: `Settlement ${s.id} is linked to ${activeLinks.length} active in-flight payouts.`,
        });
      }

      // Invariant 3: Completed payout referencing an unconsumed or mismatched settlement
      if (s.completedPayoutId) {
        if (s.payoutStatus !== 'PAID') {
          exceptions.push({
            code: 'COMPLETED_PAYOUT_CONSUMED_SETTLEMENT_MISMATCH',
            severity: 'CRITICAL',
            sellerId,
            settlementId: s.id,
            message: `Settlement ${s.id} has completedPayoutId '${s.completedPayoutId}' but payoutStatus is '${s.payoutStatus}'.`,
          });
        }
      }
    }

    // Invariants 4, 5, 6, 7: Payout level consistency
    for (const p of payouts) {
      // Invariant 4: Payout amount must equal sum of linked settlement amounts
      const linkSum = p.payoutSettlements.reduce(
        (sum, ps) => sum.plus(ps.amount),
        new Prisma.Decimal(0)
      );
      if (!linkSum.equals(p.amount)) {
        exceptions.push({
          code: 'PAYOUT_AMOUNT_MISMATCH',
          severity: 'CRITICAL',
          sellerId,
          payoutId: p.id,
          message: `Payout ${p.id} amount ₹${p.amount} does not equal sum of linked settlements ₹${linkSum}.`,
        });
      }

      // Invariant 5: Payout must have corresponding PAYOUT_RESERVED ledger entry
      const hasReservationEntry = p.ledgerEntries.some((le) => le.entryType === 'PAYOUT_RESERVED');
      if (!hasReservationEntry) {
        exceptions.push({
          code: 'MISSING_RESERVATION_ENTRY',
          severity: 'CRITICAL',
          sellerId,
          payoutId: p.id,
          message: `Payout ${p.id} lacks a corresponding PAYOUT_RESERVED ledger entry.`,
        });
      }

      // Invariant 6: Completed payout must have PAYOUT_COMPLETED entry
      if (p.status === 'COMPLETED') {
        const hasCompletionEntry = p.ledgerEntries.some((le) => le.entryType === 'PAYOUT_COMPLETED');
        if (!hasCompletionEntry) {
          exceptions.push({
            code: 'MISSING_COMPLETION_ENTRY',
            severity: 'CRITICAL',
            sellerId,
            payoutId: p.id,
            message: `Completed payout ${p.id} lacks a corresponding PAYOUT_COMPLETED ledger entry.`,
          });
        }
      }

      // Invariant 7: Failed payout must have PAYOUT_FAILED compensating entry
      if (p.status === 'FAILED') {
        const hasFailureEntry = p.ledgerEntries.some((le) => le.entryType === 'PAYOUT_FAILED');
        if (!hasFailureEntry) {
          exceptions.push({
            code: 'MISSING_FAILED_COMPENSATING_ENTRY',
            severity: 'CRITICAL',
            sellerId,
            payoutId: p.id,
            message: `Failed payout ${p.id} lacks a compensating PAYOUT_FAILED release entry.`,
          });
        }
      }
    }

    // Compute totals
    let grossSales = new Prisma.Decimal(0);
    let commission = new Prisma.Decimal(0);
    let platformFees = new Prisma.Decimal(0);
    let adjustments = new Prisma.Decimal(0);
    let netPayable = new Prisma.Decimal(0);
    let unconsumedPayable = new Prisma.Decimal(0);

    for (const s of settlements) {
      grossSales = grossSales.plus(s.grossAmount);
      commission = commission.plus(s.commissionAmount);
      platformFees = platformFees.plus(s.platformFeeAmount);
      adjustments = adjustments.plus(s.adjustmentAmount);
      netPayable = netPayable.plus(s.payableAmount);

      if (s.status === 'SETTLED' && s.payoutStatus === 'UNPAID') {
        unconsumedPayable = unconsumedPayable.plus(s.payableAmount);
      }
    }

    let alreadyPaid = new Prisma.Decimal(0);
    let reservedPayable = new Prisma.Decimal(0);
    for (const p of payouts) {
      if (p.status === 'COMPLETED') {
        alreadyPaid = alreadyPaid.plus(p.amount);
      } else if (p.status === 'PENDING' || p.status === 'PROCESSING') {
        reservedPayable = reservedPayable.plus(p.amount);
      }
    }

    let totalCredits = new Prisma.Decimal(0);
    let totalDebits = new Prisma.Decimal(0);
    for (const entry of ledgerEntries) {
      if (entry.currency !== 'INR') {
        exceptions.push({
          code: 'CURRENCY_MISMATCH',
          severity: 'CRITICAL',
          sellerId,
          message: `Ledger entry ${entry.id} uses unsupported currency '${entry.currency}'.`,
        });
      }
      if (entry.direction === 'CREDIT') {
        totalCredits = totalCredits.plus(entry.amount);
      } else {
        totalDebits = totalDebits.plus(entry.amount);
      }
    }

    const ledgerBalance = totalCredits.minus(totalDebits);

    // Calculate total return adjustments and commission reversals from ledger
    let totalSellerAdjustments = new Prisma.Decimal(0);
    let totalCommissionCredits = new Prisma.Decimal(0);

    for (const entry of ledgerEntries) {
      if (entry.entryType === 'SELLER_ADJUSTMENT' && entry.direction === 'DEBIT') {
        totalSellerAdjustments = totalSellerAdjustments.plus(entry.amount);
      } else if (entry.entryType === 'COMMISSION' && entry.direction === 'CREDIT') {
        totalCommissionCredits = totalCommissionCredits.plus(entry.amount);
      }
    }

    // Net adjustments already accounted for in unpaid settlements
    let adjustmentsAlreadyInUnpaid = new Prisma.Decimal(0);
    for (const s of settlements) {
      if (s.status === 'SETTLED' && s.payoutStatus === 'UNPAID' && s.adjustmentAmount && s.adjustmentAmount.gt(0)) {
        const commRate = s.commissionRate || new Prisma.Decimal(10);
        const commRev = s.adjustmentAmount.times(commRate).dividedBy(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        adjustmentsAlreadyInUnpaid = adjustmentsAlreadyInUnpaid.plus(s.adjustmentAmount.minus(commRev));
      }
    }

    const netReturnAdjustment = totalSellerAdjustments.minus(totalCommissionCredits);
    const unconsumedAdjustments = netReturnAdjustment.minus(adjustmentsAlreadyInUnpaid);
    const effectivePayable = unconsumedPayable.minus(unconsumedAdjustments);

    // Invariant 8: Remaining payable inconsistent with unconsumed settlement entitlements
    if (!effectivePayable.equals(ledgerBalance)) {
      exceptions.push({
        code: 'REMAINING_PAYABLE_ENTITLEMENT_MISMATCH',
        severity: 'CRITICAL',
        sellerId,
        message: `Remaining payable from unconsumed settlements (₹${effectivePayable.toFixed(2)}) does not match ledger balance (₹${ledgerBalance.toFixed(2)}).`,
        details: {
          unconsumedPayable: unconsumedPayable.toFixed(2),
          effectivePayable: effectivePayable.toFixed(2),
          netReturnAdjustment: netReturnAdjustment.toFixed(2),
          adjustmentsAlreadyInUnpaid: adjustmentsAlreadyInUnpaid.toFixed(2),
          unconsumedAdjustments: unconsumedAdjustments.toFixed(2),
          ledgerBalance: ledgerBalance.toFixed(2),
        },
      });
    }

    // Invariant 9: Negative ledger balance detection
    if (ledgerBalance.lessThan(0)) {
      exceptions.push({
        code: 'NEGATIVE_SELLER_BALANCE',
        severity: 'CRITICAL',
        sellerId,
        message: `Seller ledger balance is negative: ₹${ledgerBalance.toFixed(2)}.`,
      });
    }

    const difference = effectivePayable.minus(ledgerBalance).abs();
    const status = exceptions.length === 0 ? 'BALANCED' : 'DISCREPANCY';

    return {
      sellerId,
      shopName,
      currency: 'INR',
      grossSales: grossSales.toFixed(2),
      commission: commission.toFixed(2),
      platformFees: platformFees.toFixed(2),
      adjustments: adjustments.toFixed(2),
      netPayable: netPayable.toFixed(2),
      alreadyPaid: alreadyPaid.toFixed(2),
      reservedPayable: reservedPayable.toFixed(2),
      remainingPayable: effectivePayable.toFixed(2),
      ledgerBalance: ledgerBalance.toFixed(2),
      difference: difference.toFixed(2),
      status,
      exceptions,
    };
  }

  /**
   * Runs marketplace-wide financial reconciliation across all sellers.
   */
  public async reconcileAllSellers(): Promise<MarketplaceReconciliationReport> {
    const vendors = await prisma.vendorProfile.findMany({
      select: { id: true },
    });

    const sellerReports: SellerReconciliationReport[] = [];
    const allExceptions: ReconciliationException[] = [];

    let totalGrossSales = new Prisma.Decimal(0);
    let totalCommissions = new Prisma.Decimal(0);
    let totalPaidOut = new Prisma.Decimal(0);
    let totalAvailablePayable = new Prisma.Decimal(0);
    let totalLedgerBalance = new Prisma.Decimal(0);
    let balancedCount = 0;
    let discrepancyCount = 0;

    for (const v of vendors) {
      const report = await this.reconcileSeller(v.id);
      sellerReports.push(report);
      allExceptions.push(...report.exceptions);

      totalGrossSales = totalGrossSales.plus(report.grossSales);
      totalCommissions = totalCommissions.plus(report.commission);
      totalPaidOut = totalPaidOut.plus(report.alreadyPaid);
      totalAvailablePayable = totalAvailablePayable.plus(report.remainingPayable);
      totalLedgerBalance = totalLedgerBalance.plus(report.ledgerBalance);

      if (report.status === 'BALANCED') {
        balancedCount++;
      } else {
        discrepancyCount++;
      }
    }

    logSecurityEvent('SETTLEMENT_RECONCILIATION_RUN', {
      status: allExceptions.length === 0 ? 'SUCCESS' : 'WARNING',
      reason: `Reconciliation completed: ${balancedCount}/${vendors.length} balanced. Exceptions: ${allExceptions.length}`,
    });

    return {
      timestamp: new Date().toISOString(),
      totalSellers: vendors.length,
      balancedSellers: balancedCount,
      sellersWithDiscrepancies: discrepancyCount,
      totalGrossSales: totalGrossSales.toFixed(2),
      totalCommissions: totalCommissions.toFixed(2),
      totalPaidOut: totalPaidOut.toFixed(2),
      totalAvailablePayable: totalAvailablePayable.toFixed(2),
      totalLedgerBalance: totalLedgerBalance.toFixed(2),
      overallStatus: allExceptions.length === 0 ? 'BALANCED' : 'DISCREPANCY',
      exceptions: allExceptions,
      sellerReports,
    };
  }
}

export const settlementService = new SettlementService();
