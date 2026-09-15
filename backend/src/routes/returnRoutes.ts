// ============================================================================
// PHASE 5D: RETURNS, REFUNDS & REVERSE LOGISTICS ROUTES
// Role-scoped endpoints for Customers, Vendors, and Admins
// ============================================================================

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole, requireActiveAccount } from '../middleware/auth';
import { returnService } from '../services/returns/returnService';
import { returnPolicyService } from '../services/returns/returnPolicyService';
import { refundService } from '../services/returns/refundService';
import { returnReconciliationService } from '../services/returns/returnReconciliationService';
import { prisma } from '../prisma/client';

const router = Router();

// ============================================================================
// 1. CUSTOMER / PUBLIC ELIGIBILITY & RETURN CREATION
// ============================================================================

/**
 * POST /api/returns/eligibility
 * Evaluates return eligibility for specific items before customer submits return.
 */
router.post('/eligibility', async (req: Request, res: Response) => {
  try {
    const { orderId, suborderId, items, reason } = req.body;

    if (!orderId || !suborderId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'orderId, suborderId, and non-empty items array are required.',
      });
    }

    const eligibility = await returnPolicyService.evaluateEligibility(orderId, suborderId, items, reason);
    res.json(eligibility);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/returns
 * Submits a new return request.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { orderId, suborderId, items, reason, customerNotes, guestAccessToken } = req.body;

    if (!orderId || !suborderId || !Array.isArray(items) || items.length === 0 || !reason) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'orderId, suborderId, items, and reason are required.',
      });
    }

    // Customer identity resolution: authenticated user or valid guest access token
    let customerId: string | undefined = req.user?.userId || req.user?.id;

    if (!customerId) {
      if (!guestAccessToken) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication or valid guestAccessToken is required to submit a return.',
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order || order.guestAccessToken !== guestAccessToken) {
        return res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Invalid guest access token for this order.',
        });
      }
      customerId = order.customerId || undefined;
    }

    const returnRequest = await returnService.createReturnRequest({
      orderId,
      suborderId,
      customerId,
      items,
      reason,
      customerNotes,
    });

    res.status(201).json({ success: true, returnRequest, ...returnRequest });
  } catch (err: any) {
    console.error('RETURN_CREATION_FAILED:', err);
    const isClientError = err.message && (err.message.includes('ineligible') || err.message.includes('not found'));
    res.status(isClientError ? 400 : 500).json({ error: 'RETURN_CREATION_FAILED', message: err.message });
  }
});

/**
 * GET /api/returns/my-returns
 * Lists returns created by the authenticated customer.
 */
router.get('/my-returns', requireAuth, async (req: Request, res: Response) => {
  try {
    const customerId = req.user!.userId || req.user!.id;

    const returns = await prisma.returnRequest.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        shipment: {
          include: {
            trackingEvents: {
              orderBy: { eventTimestamp: 'desc' },
            },
          },
        },
        refunds: true,
        suborder: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(returns);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * GET /api/returns/:returnId
 * Retrieves detailed information and reverse tracking timeline for a specific return.
 */
router.get('/:returnId', async (req: Request, res: Response) => {
  try {
    const returnId = String(req.params.returnId);
    const guestAccessToken = req.query.guestAccessToken as string;

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        shipment: {
          include: {
            trackingEvents: {
              orderBy: { eventTimestamp: 'desc' },
            },
          },
        },
        refunds: {
          include: {
            refundItems: true,
            allocations: true,
          },
        },
        suborder: true,
        order: true,
        seller: true,
      },
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Return request not found.' });
    }

    // Role-based access control
    const currentUserId = req.user?.userId || req.user?.id;
    const currentUserRole = req.user?.role;
    const vendorId = req.user?.vendorId;

    let isAuthorized = false;

    if (currentUserRole === 'ADMIN') {
      isAuthorized = true;
    } else if (
      currentUserRole === 'VENDOR' &&
      (returnRequest.sellerId === vendorId || returnRequest.seller?.userId === currentUserId)
    ) {
      isAuthorized = true;
    } else if (currentUserId && returnRequest.customerId === currentUserId) {
      isAuthorized = true;
    } else if (guestAccessToken && returnRequest.order?.guestAccessToken === guestAccessToken) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'You are not authorized to view this return request.' });
    }

    res.json(returnRequest);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

// ============================================================================
// 2. VENDOR RETURN WORKFLOW
// ============================================================================

/**
 * GET /api/returns/vendor/list
 * Returns all return requests assigned to the authenticated vendor.
 */
router.get('/vendor/list', requireAuth, requireRole('VENDOR', 'ADMIN'), requireActiveAccount, async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user!.userId || req.user!.id;
    let sellerId = req.user!.vendorId;

    if (!sellerId) {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { userId: currentUserId },
      });
      sellerId = vendorProfile?.id;
    }

    if (!sellerId && req.user!.role !== 'ADMIN') {
      return res.status(400).json({ error: 'VENDOR_NOT_FOUND', message: 'Vendor profile not found for user.' });
    }

    const where: any = {};
    if (sellerId) where.sellerId = sellerId;

    const returns = await prisma.returnRequest.findMany({
      where,
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        shipment: {
          include: {
            trackingEvents: {
              orderBy: { eventTimestamp: 'desc' },
            },
          },
        },
        refunds: true,
        suborder: true,
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(returns);
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * POST /api/returns/:returnId/review
 * Vendor or Admin approves or rejects return request.
 */
router.post('/:returnId/review', requireAuth, requireRole('VENDOR', 'ADMIN'), requireActiveAccount, async (req: Request, res: Response) => {
  try {
    const returnId = String(req.params.returnId);
    const { action, items, rejectionReason, notes } = req.body;

    if (!action || (action !== 'APPROVE' && action !== 'REJECT')) {
      return res.status(400).json({ error: 'INVALID_ACTION', message: "action must be 'APPROVE' or 'REJECT'." });
    }

    const updated = await returnService.reviewReturnRequest({
      returnRequestId: returnId,
      actorUserId: req.user!.userId || req.user!.id,
      actorRole: req.user!.role,
      action,
      items,
      rejectionReason,
      notes,
    });

    res.json({ success: true, returnRequest: updated, ...updated });
  } catch (err: any) {
    const isForbidden = err.message && (err.message.includes('Unauthorized') || err.message.includes('not authorized'));
    res.status(isForbidden ? 403 : 400).json({ error: 'REVIEW_FAILED', message: err.message });
  }
});

/**
 * POST /api/returns/:returnId/dispatch
 * Dispatches reverse logistics for an approved return request.
 */
router.post('/:returnId/dispatch', requireAuth, requireRole('VENDOR', 'ADMIN'), requireActiveAccount, async (req: Request, res: Response) => {
  try {
    const returnId = String(req.params.returnId);
    const result = await returnService.dispatchReverseLogistics(returnId);
    res.json({ success: true, returnRequest: result, shipment: result?.shipment, ...result });
  } catch (err: any) {
    res.status(400).json({ error: 'DISPATCH_FAILED', message: err.message });
  }
});

/**
 * POST /api/returns/:returnId/inspect
 * Submits item inspection results by merchant/warehouse.
 */
router.post('/:returnId/inspect', requireAuth, requireRole('VENDOR', 'ADMIN'), requireActiveAccount, async (req: Request, res: Response) => {
  try {
    const returnId = String(req.params.returnId);
    const { items, inspectionNotes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'items inspection array is required.' });
    }

    const result = await returnService.inspectReturn({
      returnRequestId: returnId,
      actorUserId: req.user!.userId || req.user!.id,
      actorRole: req.user!.role,
      items,
      inspectionNotes,
    });

    res.json({ success: true, returnRequest: result, ...result });
  } catch (err: any) {
    res.status(400).json({ error: 'INSPECTION_FAILED', message: err.message });
  }
});

/**
 * POST /api/returns/:returnId/refund
 * Processes refund for an approved/inspected return request.
 */
router.post('/:returnId/refund', requireAuth, requireRole('VENDOR', 'ADMIN'), requireActiveAccount, async (req: Request, res: Response) => {
  try {
    const returnId = String(req.params.returnId);
    const result = await returnService.processReturnRefund(
      returnId,
      req.user!.userId || req.user!.id,
      req.user!.role
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: 'REFUND_FAILED', message: err.message });
  }
});

// ============================================================================
// 3. ADMIN RETURNS & REFUNDS OPERATIONS
// ============================================================================

/**
 * GET /api/returns/admin/list
 * Admin global view of all return requests.
 */
router.get('/admin/list', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { status, sellerId, limit, offset } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = String(sellerId);

    const take = Math.min(Number(limit) || 50, 100);
    const skip = Number(offset) || 0;

    const [returns, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          items: {
            include: {
              orderItem: true,
            },
          },
          shipment: true,
          refunds: true,
          suborder: true,
          seller: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.returnRequest.count({ where }),
    ]);

    res.json({ returns, total, limit: take, offset: skip });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * GET /api/returns/admin/refunds
 * Admin global view of all refunds and allocations.
 */
router.get('/admin/refunds', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { provider, status, limit, offset } = req.query;

    const where: any = {};
    if (provider) where.provider = provider as any;
    if (status) where.status = status as any;

    const take = Math.min(Number(limit) || 50, 100);
    const skip = Number(offset) || 0;

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          refundItems: true,
          allocations: true,
          order: true,
          seller: true,
          returnRequest: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.refund.count({ where }),
    ]);

    res.json({ refunds, total, limit: take, offset: skip });
  } catch (err: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

/**
 * GET /api/returns/admin/reconciliation
 * Runs the 15-point automated return/refund reconciliation audit.
 */
router.get('/admin/reconciliation', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const report = await returnReconciliationService.runReconciliation();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'RECONCILIATION_ERROR', message: err.message });
  }
});

export default router;
