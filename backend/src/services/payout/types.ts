import { Prisma } from '@prisma/client';

export interface PayoutRequest {
  payoutId: string;
  sellerId: string;
  amount: Prisma.Decimal | number | string;
  currency: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
}

export interface PayoutResponse {
  success: boolean;
  providerPayoutId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface PayoutStatusResult {
  providerPayoutId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface IPayoutProvider {
  readonly providerName: string;
  createPayout(req: PayoutRequest): Promise<PayoutResponse>;
  getPayoutStatus(providerPayoutId: string): Promise<PayoutStatusResult>;
}
