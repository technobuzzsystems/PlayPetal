import crypto from 'crypto';
import { IPayoutProvider, PayoutRequest, PayoutResponse, PayoutStatusResult } from './types';

/**
 * Sandbox / Mock Payout Provider for Phase 5C
 *
 * Guarantees:
 * 1. Zero real money/banking transfers.
 * 2. Deterministic provider references: sbx_po_<hash>.
 * 3. Support for deterministic success / failure simulation via request metadata.
 * 4. Safe retry and idempotency verification.
 */
export class SandboxPayoutProvider implements IPayoutProvider {
  public readonly providerName = 'SANDBOX';

  // In-memory status store for sandbox status queries
  private statusStore = new Map<string, PayoutStatusResult>();

  public async createPayout(req: PayoutRequest): Promise<PayoutResponse> {
    // Generate deterministic provider reference from sellerId and idempotencyKey
    const hash = crypto
      .createHash('sha256')
      .update(`${req.sellerId}:${req.idempotencyKey}:${req.payoutId}`)
      .digest('hex')
      .slice(0, 16);
    const providerPayoutId = `sbx_po_${hash}`;

    // Simulation hooks:
    // 1. Explicit metadata flag
    // 2. Failure reason passed in metadata
    // 3. Sentinel amount ₹99999.00 or string containing 'fail'
    const shouldFail =
      Boolean(req.metadata?.simulateFailure) ||
      Boolean(req.metadata?.failureReason) ||
      String(req.idempotencyKey).toLowerCase().includes('fail') ||
      String(req.amount) === '99999';

    if (shouldFail) {
      const failureReason =
        req.metadata?.failureReason ||
        'BANK_NETWORK_REJECTED: Simulated sandbox beneficiary account validation failed.';

      const result: PayoutResponse = {
        success: false,
        providerPayoutId,
        status: 'FAILED',
        failureReason,
        metadata: {
          simulated: true,
          mode: 'SANDBOX',
          timestamp: new Date().toISOString(),
        },
      };

      this.statusStore.set(providerPayoutId, result);
      return result;
    }

    const result: PayoutResponse = {
      success: true,
      providerPayoutId,
      status: 'COMPLETED',
      metadata: {
        simulated: true,
        mode: 'SANDBOX',
        settlementTimestamp: new Date().toISOString(),
        transferType: 'NEFT_IMPS_SIMULATED',
      },
    };

    this.statusStore.set(providerPayoutId, result);
    return result;
  }

  public async getPayoutStatus(providerPayoutId: string): Promise<PayoutStatusResult> {
    const existing = this.statusStore.get(providerPayoutId);
    if (existing) {
      return existing;
    }

    // Default completed for sandbox lookups if not explicitly failed
    return {
      providerPayoutId,
      status: 'COMPLETED',
      metadata: {
        simulated: true,
        inferred: true,
      },
    };
  }

  // Testing helper to reset mock store
  public reset(): void {
    this.statusStore.clear();
  }
}
