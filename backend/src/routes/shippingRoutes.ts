// ============================================================================
// PHASE 5B: SHIPPING & LOGISTICS ROUTES
// ============================================================================

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';
import { shippingService, ShippingActor } from '../services/shippingService';

const router = Router();

// ============================================================================
// POST /api/shipping/suborders/:suborderId/create
// Creates an authoritative shipment for a SellerSuborder.
// Protected by Vendor ownership or Admin global authority. Customers strictly blocked.
// ============================================================================
router.post(
  '/suborders/:suborderId/create',
  requireAuth,
  requireRole('ADMIN', 'VENDOR'),
  requireActiveAccount,
  async (req: Request, res: Response) => {
    try {
      const suborderId = String(req.params.suborderId);
      const actor: ShippingActor = {
        id: req.user!.userId || req.user!.id,
        role: req.user!.role,
        vendorId: req.user!.vendorId,
        email: req.user!.email,
      };

      const shipment = await shippingService.createShipmentForSuborder(suborderId, actor);
      res.status(201).json(shipment);
    } catch (error: any) {
      if (error.message && error.message.includes('FORBIDDEN')) {
        return res.status(403).json({ error: 'FORBIDDEN', message: error.message });
      }
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
      }
      const isClientError =
        error.message &&
        (error.message.includes('Cannot create shipment') ||
          error.message.includes('unpaid') ||
          error.message.includes('cancelled') ||
          error.message.includes('already'));

      res.status(isClientError ? 400 : 500).json({ error: error.message || 'Failed to create shipment.' });
    }
  }
);

// ============================================================================
// GET /api/shipping/shipments/:id
// Role-scoped tracking inspection endpoint.
// Customers can view only own shipments; Vendors only own suborders; Admins all.
// Guests may access via cryptographic guestAccessToken.
// ============================================================================
router.get('/shipments/:id', async (req: Request, res: Response) => {
  try {
    const shipmentId = String(req.params.id);
    const guestToken = String(
      req.headers['x-guest-token'] || req.query.guestAccessToken || req.query.token || ''
    ).trim();

    let actor: ShippingActor;
    if (req.user) {
      actor = {
        id: req.user.userId || req.user.id,
        role: req.user.role,
        vendorId: req.user.vendorId,
        email: req.user.email,
      };
    } else if (guestToken) {
      actor = {
        id: 'guest',
        role: 'CUSTOMER',
        guestAccessToken: guestToken,
      };
    } else {
      return res.status(401).json({ error: 'Authentication required to inspect shipment tracking.' });
    }

    const tracking = await shippingService.getShipmentTracking(shipmentId, actor);
    res.json(tracking);
  } catch (error: any) {
    if (error.message && error.message.includes('FORBIDDEN')) {
      return res.status(403).json({ error: 'FORBIDDEN', message: error.message });
    }
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to retrieve shipment tracking.' });
  }
});

// ============================================================================
// POST /api/shipping/webhook
// Logistics provider webhook handler with HMAC-SHA256 signature verification
// and database-safe event idempotency.
// ============================================================================
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-shiprocket-signature'] ||
      req.headers['x-signature'] ||
      req.headers['signature']) as string | undefined;

    if (!signature) {
      return res.status(400).json({ error: 'Missing webhook signature header' });
    }

    const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));

    const result = await shippingService.processWebhook(rawBody, signature, req.body);
    res.json({ received: true, ...result });
  } catch (err: any) {
    if (err.message && err.message.includes('INVALID_WEBHOOK_SIGNATURE')) {
      return res.status(400).json({ error: 'INVALID_WEBHOOK_SIGNATURE', message: 'Signature verification failed.' });
    }
    console.error('[Shipping Webhook Error]:', err.message);
    res.status(500).json({ error: 'WEBHOOK_PROCESSING_FAILED', message: err.message });
  }
});

// ============================================================================
// GET /api/shipping/admin/reconciliation
// Operational shipping reconciliation engine. Detects missing AWBs, stuck shipments,
// failed deliveries, RTO, and status mismatches.
// Admin RBAC only.
// ============================================================================
router.get(
  '/admin/reconciliation',
  requireAuth,
  requireRole('ADMIN'),
  requireActiveAccount,
  async (_req: Request, res: Response) => {
    try {
      const report = await shippingService.getShippingReconciliation();
      res.json(report);
    } catch (err: any) {
      console.error('[Shipping Reconciliation Error]:', err.message);
      res.status(500).json({ error: 'Failed to generate shipping reconciliation report.' });
    }
  }
);

// ============================================================================
// POST /api/shipping/sandbox-signature (Non-Production Helper for Tests)
// Generates a valid HMAC-SHA256 signature for test webhook bodies.
// ============================================================================
router.post('/sandbox-signature', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  try {
    const secret = process.env.SHIPPING_WEBHOOK_SECRET || 'shipping-webhook-test-secret-32-chars';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = crypto.createHmac('sha256', secret).update(Buffer.from(rawBody, 'utf8')).digest('hex');
    res.json({ signature });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate test signature' });
  }
});

export default router;
