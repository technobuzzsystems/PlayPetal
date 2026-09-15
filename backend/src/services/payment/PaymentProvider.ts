import { Prisma } from '@prisma/client';

export interface CreateGatewayOrderParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in minor units or INR
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface GatewayOrderResult {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  provider: string;
  keyId?: string;
}

export interface VerifyPaymentParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

export interface VerifyWebhookParams {
  rawBody: Buffer | string;
  signature: string;
}

export interface GatewayPaymentDetails {
  gatewayPaymentId: string;
  gatewayOrderId?: string;
  amount: number;
  currency: string;
  status: 'captured' | 'authorized' | 'failed' | 'refunded' | 'pending';
  method?: string;
  email?: string;
  contact?: string;
  errorCode?: string;
  errorDescription?: string;
}

export interface RefundGatewayPaymentParams {
  gatewayPaymentId: string;
  amount: Prisma.Decimal;
  currency?: string;
  reason?: string;
  notes?: Record<string, string>;
  receipt?: string;
}

export interface GatewayRefundResult {
  gatewayRefundId: string;
  gatewayPaymentId: string;
  amount: Prisma.Decimal;
  currency: string;
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED';
  rawResponse?: any;
  errorMessage?: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly keyId: string;

  /**
   * Creates a payment order on the gateway with the authoritative server amount.
   */
  createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult>;

  /**
   * Cryptographically verifies the client-returned payment callback signature.
   */
  verifyPaymentSignature(params: VerifyPaymentParams): boolean;

  /**
   * Cryptographically verifies the incoming webhook signature.
   */
  verifyWebhookSignature(params: VerifyWebhookParams): boolean;

  /**
   * Fetches the payment status directly from the gateway for server reconciliation.
   */
  fetchPayment(gatewayPaymentId: string): Promise<GatewayPaymentDetails | null>;

  /**
   * Executes an online refund against a previously captured payment.
   */
  refundPayment?(params: RefundGatewayPaymentParams): Promise<GatewayRefundResult>;
}