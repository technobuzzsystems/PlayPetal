import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { getPaymentProvider, PaymentProvider } from './payment';
import { logSecurityEvent } from '../utils/security';

export interface CreatePaymentAttemptInput {
  orderId: string;
  idempotencyKey?: string;
  authUser?: any;
}

export interface VerifyPaymentInput {
  orderId?: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
  authUser?: any;
}

export interface WebhookInput {
  rawBody: Buffer | string;
  signature: string;
  payload: any;
}

export class PaymentService {
  private getProvider(): PaymentProvider {
    return getPaymentProvider();
  }

  /**
   * Creates an authorized PaymentAttempt for an existing Order.
   * Server derives authoritative totalAmount from database (client amount is strictly ignored).
   */
  async createPaymentAttempt(input: CreatePaymentAttemptInput) {
    const { orderId, idempotencyKey, authUser } = input;
    if (!orderId) {
      throw new Error('orderId is required to create a payment attempt.');
    }

    // 1. Fetch Order from database
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // 2. Ownership & Access Validation
    if (authUser && authUser.role === 'CUSTOMER') {
      if (order.customerId && order.customerId !== authUser.userId) {
        logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
          userId: authUser.userId,
          email: authUser.email,
          role: authUser.role,
          status: 'WARNING',
          resourceId: order.orderNumber,
          reason: 'Customer attempted to pay for an order belonging to another customer',
        });
        throw new Error('FORBIDDEN: You do not have permission to pay for this order.');
      }
    }

    // 3. Payable state verification
    if (order.paymentStatus === 'Paid') {
      throw new Error('ORDER_ALREADY_PAID: This order has already been paid successfully.');
    }

    if (order.status === 'Cancelled') {
      throw new Error('ORDER_CANCELLED: Cannot pay for a cancelled order.');
    }

    // 4. Idempotency Check on PaymentAttempt
    if (idempotencyKey) {
      const existingAttempt = await prisma.paymentAttempt.findUnique({
        where: { idempotencyKey },
      });
      if (existingAttempt) {
        const provider = this.getProvider();
        return {
          paymentAttemptId: existingAttempt.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: Number(existingAttempt.amount),
          currency: existingAttempt.currency,
          gatewayOrderId: existingAttempt.gatewayOrderId,
          keyId: provider.keyId,
          provider: existingAttempt.provider,
          status: existingAttempt.status,
          customer: {
            name: order.customerName,
            email: order.customerEmail,
            phone: order.customerPhone || '',
          },
        };
      }
    }

    // 5. Authoritative Decimal-safe Amount from Order
    const authoritativeAmount = Number(order.totalAmount);
    if (authoritativeAmount <= 0) {
      throw new Error('INVALID_AMOUNT: Order total must be greater than zero.');
    }

    const provider = this.getProvider();

    // 6. Create Gateway Order
    const gatewayResult = await provider.createOrder({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: authoritativeAmount,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
      },
    });

    // 7. Persist PaymentAttempt in PostgreSQL
    const attempt = await prisma.paymentAttempt.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        gatewayOrderId: gatewayResult.gatewayOrderId,
        amount: order.totalAmount, // exact Decimal
        currency: gatewayResult.currency || 'INR',
        status: 'PENDING',
        idempotencyKey: idempotencyKey || null,
        metadata: {
          orderNumber: order.orderNumber,
          createdVia: 'WEB_CHECKOUT',
        },
      },
    });

    // Update order paymentMethod if specified
    if (order.paymentMethod === 'Cash on Delivery') {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentMethod: 'Online Payment (Razorpay)' },
      });
    }

    logSecurityEvent('PAYMENT_CREATED', {
      userId: order.customerId || 'guest',
      email: order.customerEmail,
      role: authUser?.role || 'CUSTOMER',
      status: 'SUCCESS',
      resourceId: attempt.id,
      reason: `Payment attempt created for order ${order.orderNumber} (Amount: ₹${authoritativeAmount})`,
    });

    // 8. Return safe client information (NEVER secrets)
    return {
      paymentAttemptId: attempt.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: authoritativeAmount,
      currency: attempt.currency,
      gatewayOrderId: attempt.gatewayOrderId,
      keyId: provider.keyId,
      provider: attempt.provider,
      status: attempt.status,
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone || '',
      },
    };
  }

  /**
   * Cryptographically verifies browser callback payment result and transitions state.
   */
  async verifyPayment(input: VerifyPaymentInput) {
    const { orderId, gatewayOrderId, gatewayPaymentId, signature, authUser } = input;

    if (!gatewayOrderId || !gatewayPaymentId || !signature) {
      throw new Error('gatewayOrderId, gatewayPaymentId, and signature are required for payment verification.');
    }

    // 1. Locate PaymentAttempt
    let attempt = await prisma.paymentAttempt.findUnique({
      where: { gatewayOrderId },
      include: { order: true },
    });

    if (!attempt && orderId) {
      attempt = await prisma.paymentAttempt.findFirst({
        where: {
          OR: [{ orderId }, { order: { orderNumber: orderId } }],
          gatewayOrderId,
        },
        include: { order: true },
      });
    }

    if (!attempt) {
      throw new Error(`PaymentAttempt not found for gatewayOrderId: ${gatewayOrderId}`);
    }

    const order = attempt.order;

    // Ownership check if authenticated
    if (authUser && authUser.role === 'CUSTOMER' && order.customerId && order.customerId !== authUser.userId) {
      throw new Error('FORBIDDEN: You do not own this order.');
    }

    const provider = this.getProvider();

    // 2. Cryptographic Signature Verification
    const isValid = provider.verifyPaymentSignature({
      gatewayOrderId,
      gatewayPaymentId,
      signature,
    });

    if (!isValid) {
      await prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Cryptographic signature verification failed',
        },
      });

      logSecurityEvent('PAYMENT_FAILED', {
        userId: order.customerId || 'guest',
        email: order.customerEmail,
        status: 'WARNING',
        resourceId: attempt.id,
        reason: `Cryptographic signature mismatch for order ${order.orderNumber} / gateway payment ${gatewayPaymentId}`,
      });

      throw new Error('INVALID_SIGNATURE: Payment verification failed due to signature mismatch.');
    }

    // 3. Atomic Database State Synchronization
    const result = await prisma.$transaction(async (tx) => {
      // Update PaymentAttempt to CAPTURED
      const updatedAttempt = await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          gatewayPaymentId,
          status: 'CAPTURED',
          updatedAt: new Date(),
        },
      });

      // Update Order to Paid and Confirmed
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'Paid',
          status: 'Confirmed',
          updatedAt: new Date(),
        },
      });

      // Update Suborders to CONFIRMED
      await tx.sellerSuborder.updateMany({
        where: { orderId: order.id },
        data: { status: 'CONFIRMED' },
      });

      return { updatedAttempt, updatedOrder };
    });

    logSecurityEvent('PAYMENT_CAPTURED', {
      userId: order.customerId || 'guest',
      email: order.customerEmail,
      status: 'SUCCESS',
      resourceId: attempt.id,
      reason: `Payment successfully captured for order ${order.orderNumber} (Gateway Payment ID: ${gatewayPaymentId})`,
    });

    return {
      success: true,
      message: 'Payment verified and captured successfully',
      orderId: result.updatedOrder.id,
      orderNumber: result.updatedOrder.orderNumber,
      paymentStatus: result.updatedOrder.paymentStatus,
      orderStatus: result.updatedOrder.status,
      amount: Number(result.updatedAttempt.amount),
    };
  }

  /**
   * Records a payment failure or cancellation on a PaymentAttempt and transitions
   * order paymentStatus to Failed, keeping the Order ready for retry.
   */
  async recordPaymentFailure(params: {
    orderId: string;
    gatewayOrderId?: string;
    errorMessage?: string;
    authUser?: any;
  }) {
    const { orderId, gatewayOrderId, errorMessage, authUser } = params;

    const attempt = await prisma.paymentAttempt.findFirst({
      where: {
        orderId,
        ...(gatewayOrderId ? { gatewayOrderId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });

    if (!attempt) {
      throw new Error(`PaymentAttempt not found for orderId: ${orderId}`);
    }

    const order = attempt.order;
    if (authUser && authUser.role === 'CUSTOMER' && order.customerId && order.customerId !== authUser.userId) {
      throw new Error('FORBIDDEN: You do not own this order.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const att = await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          errorMessage: errorMessage || 'Payment declined or cancelled by customer',
          updatedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'Failed',
          updatedAt: new Date(),
        },
      });

      return att;
    });

    logSecurityEvent('PAYMENT_FAILED', {
      userId: order.customerId || 'guest',
      email: order.customerEmail,
      status: 'WARNING',
      resourceId: attempt.id,
      reason: `Payment failed for order ${order.orderNumber}: ${errorMessage || 'Declined'}`,
    });

    return {
      success: true,
      paymentAttemptId: updated.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'FAILED',
      errorMessage: updated.errorMessage,
    };
  }

  /**
   * Processes gateway webhooks with raw signature verification and database idempotency.
   */
  async handleWebhook(input: WebhookInput) {
    const { rawBody, signature, payload } = input;

    if (!rawBody || !signature) {
      throw new Error('Missing raw body or webhook signature');
    }

    const provider = this.getProvider();

    // 1. Verify Webhook Signature
    const isValid = provider.verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        status: 'WARNING',
        reason: 'Invalid webhook signature received from gateway endpoint',
      });
      throw new Error('INVALID_WEBHOOK_SIGNATURE');
    }

    // 2. Identify Event & Idempotency Key
    const event = payload.event;
    const eventId = payload.event_id || payload.id || `evt_${payload.created_at || Date.now()}`;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const gatewayPaymentId = paymentEntity?.id;
    const gatewayOrderId = paymentEntity?.order_id || orderEntity?.id;

    // Check if this webhook event was already processed (Database-level idempotency)
    const existingProcessed = await prisma.paymentAttempt.findFirst({
      where: { webhookEventId: eventId },
    });

    if (existingProcessed) {
      logSecurityEvent('PAYMENT_WEBHOOK_REPLAY', {
        status: 'INFO',
        resourceId: eventId,
        reason: `Webhook event ${eventId} already processed (Replay protection acknowledged)`,
      });
      return { status: 'acknowledged', replay: true };
    }

    // 3. Handle Supported Events
    if (event === 'payment.captured' || event === 'order.paid') {
      if (!gatewayOrderId && !gatewayPaymentId) {
        return { status: 'ignored', reason: 'Missing gateway IDs' };
      }

      const attempt = await prisma.paymentAttempt.findFirst({
        where: {
          OR: [
            { gatewayOrderId: gatewayOrderId || undefined },
            { gatewayPaymentId: gatewayPaymentId || undefined },
          ],
        },
        include: { order: true },
      });

      if (attempt) {
        await prisma.$transaction(async (tx) => {
          await tx.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: 'CAPTURED',
              gatewayPaymentId: gatewayPaymentId || attempt.gatewayPaymentId,
              webhookEventId: eventId,
              updatedAt: new Date(),
            },
          });

          await tx.order.update({
            where: { id: attempt.orderId },
            data: {
              paymentStatus: 'Paid',
              status: 'Confirmed',
              updatedAt: new Date(),
            },
          });
        });

        logSecurityEvent('PAYMENT_WEBHOOK_VERIFIED', {
          status: 'SUCCESS',
          resourceId: attempt.id,
          reason: `Webhook ${event} confirmed capture for order ${attempt.order.orderNumber}`,
        });
      }
      return { status: 'processed', event };
    }

    if (event === 'payment.failed') {
      if (gatewayOrderId || gatewayPaymentId) {
        const attempt = await prisma.paymentAttempt.findFirst({
          where: {
            OR: [
              { gatewayOrderId: gatewayOrderId || undefined },
              { gatewayPaymentId: gatewayPaymentId || undefined },
            ],
          },
          include: { order: true },
        });

        if (attempt) {
          const errorDesc = paymentEntity?.error_description || 'Payment failed at gateway';
          await prisma.$transaction(async (tx) => {
            await tx.paymentAttempt.update({
              where: { id: attempt.id },
              data: {
                status: 'FAILED',
                errorMessage: errorDesc,
                webhookEventId: eventId,
                updatedAt: new Date(),
              },
            });

            // Mark order as failed payment, allowing safe retry with same order
            await tx.order.update({
              where: { id: attempt.orderId },
              data: {
                paymentStatus: 'Failed',
              },
            });
          });

          logSecurityEvent('PAYMENT_FAILED', {
            status: 'WARNING',
            resourceId: attempt.id,
            reason: `Webhook payment.failed for order ${attempt.order.orderNumber}: ${errorDesc}`,
          });
        }
      }
      return { status: 'processed', event };
    }

    // Default acknowledge for other events without mutating state
    return { status: 'acknowledged', event, message: 'Unhandled event acknowledged safely' };
  }

  /**
   * Retrieves payment attempt history for an order.
   */
  async getOrderPayments(orderId: string, authUser?: any) {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) return [];

    if (authUser && authUser.role === 'CUSTOMER' && order.customerId && order.customerId !== authUser.userId) {
      throw new Error('FORBIDDEN');
    }

    return order.payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      provider: p.provider,
      gatewayOrderId: p.gatewayOrderId,
      gatewayPaymentId: p.gatewayPaymentId,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      errorMessage: p.errorMessage,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Admin Payment Reconciliation: detects state mismatches, amount divergences, and duplicate captures.
   */
  async getReconciliationReport() {
    const orders = await prisma.order.findMany({
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const discrepancies: any[] = [];

    for (const o of orders) {
      const capturedPayments = o.payments.filter((p) => p.status === 'CAPTURED');

      // Check 1: Duplicate successful payments
      if (capturedPayments.length > 1) {
        discrepancies.push({
          type: 'DUPLICATE_CAPTURE',
          severity: 'HIGH',
          orderId: o.id,
          orderNumber: o.orderNumber,
          message: `Order has ${capturedPayments.length} captured payments in database.`,
          capturedPayments: capturedPayments.map((p) => ({
            id: p.id,
            gatewayPaymentId: p.gatewayPaymentId,
            amount: Number(p.amount),
          })),
        });
      }

      // Check 2: State mismatch - Gateway captured but Order still Pending or Failed
      if (capturedPayments.length > 0 && o.paymentStatus !== 'Paid') {
        discrepancies.push({
          type: 'PAYMENT_STATE_MISMATCH',
          severity: 'HIGH',
          orderId: o.id,
          orderNumber: o.orderNumber,
          message: `Payment attempt is CAPTURED but parent Order status is '${o.paymentStatus}'.`,
          orderPaymentStatus: o.paymentStatus,
          capturedPaymentId: capturedPayments[0].gatewayPaymentId,
        });
      }

      // Check 3: Amount mismatch between Order total and PaymentAttempt amount
      for (const p of o.payments) {
        if (!p.amount.equals(o.totalAmount)) {
          discrepancies.push({
            type: 'AMOUNT_MISMATCH',
            severity: 'CRITICAL',
            orderId: o.id,
            orderNumber: o.orderNumber,
            message: `Payment attempt amount (₹${p.amount}) does not equal order totalAmount (₹${o.totalAmount}).`,
            orderTotal: Number(o.totalAmount),
            attemptAmount: Number(p.amount),
          });
        }
      }
    }

    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.paymentStatus === 'Paid').length;
    const pendingOrders = orders.filter((o) => o.paymentStatus === 'Pending').length;
    const failedOrders = orders.filter((o) => o.paymentStatus === 'Failed').length;

    const totalPaymentAttempts = await prisma.paymentAttempt.count();
    const totalCapturedAttempts = await prisma.paymentAttempt.count({ where: { status: 'CAPTURED' } });
    const totalFailedAttempts = await prisma.paymentAttempt.count({ where: { status: 'FAILED' } });
    const totalPendingAttempts = await prisma.paymentAttempt.count({ where: { status: 'PENDING' } });

    const recentPayments = await prisma.paymentAttempt.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { orderNumber: true, customerName: true, paymentStatus: true },
        },
      },
    });

    return {
      summary: {
        totalOrders,
        paidOrders,
        pendingOrders,
        failedOrders,
        totalPaymentAttempts,
        totalCapturedAttempts,
        totalFailedAttempts,
        totalPendingAttempts,
        mismatchCount: discrepancies.length,
        totalDiscrepancies: discrepancies.length,
        isHealthy: discrepancies.length === 0,
      },
      mismatches: discrepancies,
      discrepancies,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order.orderNumber,
        customerName: p.order.customerName,
        provider: p.provider,
        gatewayOrderId: p.gatewayOrderId,
        gatewayPaymentId: p.gatewayPaymentId,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        errorMessage: p.errorMessage,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }
}

export const paymentService = new PaymentService();