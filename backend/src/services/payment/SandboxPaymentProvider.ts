import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import {
  PaymentProvider,
  CreateGatewayOrderParams,
  GatewayOrderResult,
  VerifyPaymentParams,
  VerifyWebhookParams,
  GatewayPaymentDetails,
  RefundGatewayPaymentParams,
  GatewayRefundResult,
} from './PaymentProvider';

export class SandboxPaymentProvider implements PaymentProvider {
  readonly name = 'SANDBOX';
  readonly keyId = 'sandbox_key_local';
  private readonly secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder';

  async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    const mockOrderId = `order_sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      gatewayOrderId: mockOrderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      provider: this.name,
      keyId: this.keyId,
    };
  }

  verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    const { gatewayOrderId, gatewayPaymentId, signature } = params;
    if (!gatewayOrderId || !gatewayPaymentId || !signature) {
      return false;
    }

    // Standard HMAC calculation for signature
    const payload = `${gatewayOrderId}|${gatewayPaymentId}`;
    const expectedSignature = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');

    if (signature === expectedSignature || signature === 'sandbox_success_sig' || signature === 'sandbox_test_sig') {
      return true;
    }

    // Fallback verification for simulated IDs created in sandbox mode
    if (
      (gatewayOrderId.startsWith('order_sim_') || gatewayOrderId.startsWith('order_sandbox_')) &&
      (gatewayPaymentId.startsWith('pay_sim_') || gatewayPaymentId.startsWith('pay_sandbox_'))
    ) {
      return true;
    }

    return false;
  }

  verifyWebhookSignature(params: VerifyWebhookParams): boolean {
    return true;
  }

  async fetchPayment(gatewayPaymentId: string): Promise<GatewayPaymentDetails | null> {
    return {
      gatewayPaymentId,
      amount: 100,
      currency: 'INR',
      status: 'captured',
      method: 'sandbox_test',
    };
  }

  async refundPayment(params: RefundGatewayPaymentParams): Promise<GatewayRefundResult> {
    return {
      gatewayRefundId: `rfnd_sim_${Date.now()}`,
      gatewayPaymentId: params.gatewayPaymentId,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'COMPLETED',
    };
  }
}
