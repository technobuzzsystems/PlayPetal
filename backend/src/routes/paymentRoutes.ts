import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { paymentService } from '../services/paymentService';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';

const router = Router();

// ============================================================================
// POST /api/payments/create - Initiate Gateway Payment for an Order
// ============================================================================
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const idempotencyKey = (req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body.idempotencyKey) as string | undefined;

    const result = await paymentService.createPaymentAttempt({
      orderId: String(orderId).trim(),
      idempotencyKey,
      authUser: req.user,
    });

    res.status(201).json(result);
  } catch (err: any) {
    if (err.message && err.message.includes('FORBIDDEN')) {
      return res.status(403).json({ error: 'FORBIDDEN', message: err.message });
    }
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND', message: err.message });
    }
    if (err.message && (err.message.includes('ORDER_ALREADY_PAID') || err.message.includes('ORDER_CANCELLED'))) {
      return res.status(400).json({ error: 'INVALID_ORDER_STATE', message: err.message });
    }
    console.error('Payment creation error:', err);
    res.status(500).json({ error: 'FAILED_TO_CREATE_PAYMENT', message: err.message });
  }
});

// ============================================================================
// POST /api/payments/verify - Cryptographic Payment Callback Verification
// ============================================================================
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { orderId, gatewayOrderId, gatewayPaymentId } = req.body;
    const signature = req.body.signature || req.body.gatewaySignature;

    if (!gatewayOrderId || !gatewayPaymentId || !signature) {
      return res.status(400).json({
        error: 'INVALID_PAYLOAD',
        message: 'gatewayOrderId, gatewayPaymentId, and signature are required for verification.',
      });
    }

    const result = await paymentService.verifyPayment({
      orderId,
      gatewayOrderId,
      gatewayPaymentId,
      signature,
      authUser: req.user,
    });

    res.json(result);
  } catch (err: any) {
    if (err.message && err.message.includes('FORBIDDEN')) {
      return res.status(403).json({ error: 'FORBIDDEN', message: err.message });
    }
    if (err.message && err.message.includes('INVALID_SIGNATURE')) {
      return res.status(400).json({ error: 'INVALID_SIGNATURE', message: err.message });
    }
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: 'PAYMENT_NOT_FOUND', message: err.message });
    }
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'VERIFICATION_FAILED', message: err.message });
  }
});

// ============================================================================
// POST /api/payments/failure - Record Payment Failure / Customer Cancellation
// ============================================================================
router.post('/failure', async (req: Request, res: Response) => {
  try {
    const { orderId, gatewayOrderId, errorMessage } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const result = await paymentService.recordPaymentFailure({
      orderId,
      gatewayOrderId,
      errorMessage,
      authUser: req.user,
    });

    res.json(result);
  } catch (err: any) {
    if (err.message && err.message.includes('FORBIDDEN')) {
      return res.status(403).json({ error: 'FORBIDDEN', message: err.message });
    }
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: 'NOT_FOUND', message: err.message });
    }
    res.status(500).json({ error: 'Failed to record failure', message: err.message });
  }
});

// ============================================================================
// POST /api/payments/sandbox-signature - Non-Production Signature Generation
// ============================================================================
router.post('/sandbox-signature', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  try {
    const { gatewayOrderId, gatewayPaymentId } = req.body;
    if (!gatewayOrderId) {
      return res.status(400).json({ error: 'gatewayOrderId is required' });
    }
    const paymentId = gatewayPaymentId || `pay_sim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder';
    const payload = `${gatewayOrderId}|${paymentId}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    res.json({
      gatewayOrderId,
      gatewayPaymentId: paymentId,
      signature,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate sandbox signature' });
  }
});

// ============================================================================
// POST /api/payments/webhook - Gateway Webhook Endpoint with Raw Signature Verification
// ============================================================================
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-razorpay-signature'] ||
      req.headers['x-signature'] ||
      req.headers['signature']) as string | undefined;

    if (!signature) {
      return res.status(400).json({ error: 'Missing webhook signature header' });
    }

    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));

    const result = await paymentService.handleWebhook({
      rawBody,
      signature,
      payload: req.body,
    });

    res.json({ received: true, ...result });
  } catch (err: any) {
    if (err.message === 'INVALID_WEBHOOK_SIGNATURE') {
      return res.status(400).json({ error: 'INVALID_WEBHOOK_SIGNATURE' });
    }
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'WEBHOOK_PROCESSING_FAILED', message: err.message });
  }
});

// ============================================================================
// GET /api/payments/order/:orderId - Payment Attempt History for an Order
// ============================================================================
router.get('/order/:orderId', async (req: Request, res: Response) => {
  try {
    const orderId = String(req.params.orderId);
    const payments = await paymentService.getOrderPayments(orderId, req.user);
    res.json({ payments });
  } catch (err: any) {
    if (err.message && err.message.includes('FORBIDDEN')) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// ============================================================================
// GET /api/payments/admin/reconciliation - Admin Payment Reconciliation Engine
// ============================================================================
router.get(
  '/admin/reconciliation',
  requireAuth,
  requireRole('ADMIN'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const report = await paymentService.getReconciliationReport();
      res.json(report);
    } catch (err: any) {
      console.error('Reconciliation error:', err);
      res.status(500).json({ error: 'Failed to generate reconciliation report' });
    }
  }
);

export default router;