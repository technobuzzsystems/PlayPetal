import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { authenticate, requireAuth, requireRole } from '../middleware/auth';
import { isValidEmail, newsletterRateLimiter, logSecurityEvent } from '../utils/security';

const router = Router();

// ============================================================================
// 1. PUBLIC ENDPOINT: Customer Subscribe
// ============================================================================

router.post('/subscribe', newsletterRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, source } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Please enter a valid email address.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanSource = source && typeof source === 'string' && source.length <= 50
      ? source.trim()
      : 'homepage';

    // Check existing subscriber
    let existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        return res.status(200).json({
          success: true,
          message: "You're already subscribed.",
          isAlreadySubscribed: true,
        });
      }

      // Existing UNSUBSCRIBED record -> Reactivate
      const updated = await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          subscribedAt: new Date(),
          unsubscribedAt: null,
          source: cleanSource || existing.source,
        },
      });

      logSecurityEvent('ACCOUNT_CREATED', {
        email: cleanEmail,
        status: 'SUCCESS',
        reason: 'Newsletter subscription reactivated by customer',
      });

      return res.status(200).json({
        success: true,
        message: "You're subscribed! Welcome to the PlayPetal Club.",
        isResubscribed: true,
      });
    }

    // New subscriber creation with race condition unique constraint safety
    try {
      await prisma.newsletterSubscriber.create({
        data: {
          email: cleanEmail,
          status: 'ACTIVE',
          source: cleanSource,
          subscribedAt: new Date(),
        },
      });

      logSecurityEvent('ACCOUNT_CREATED', {
        email: cleanEmail,
        status: 'SUCCESS',
        reason: 'New newsletter subscription created by customer',
      });

      return res.status(201).json({
        success: true,
        message: "You're subscribed! Welcome to the PlayPetal Club.",
        isNew: true,
      });
    } catch (createErr: any) {
      // Catch Prisma P2002 Unique Constraint Violation (concurrent requests)
      if (createErr.code === 'P2002') {
        const raceExisting = await prisma.newsletterSubscriber.findUnique({
          where: { email: cleanEmail },
        });

        if (raceExisting && raceExisting.status === 'ACTIVE') {
          return res.status(200).json({
            success: true,
            message: "You're already subscribed.",
            isAlreadySubscribed: true,
          });
        }
      }
      throw createErr;
    }
  } catch (error: any) {
    console.error('[Newsletter Subscribe API] Error:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Unable to subscribe right now. Please try again.',
    });
  }
});

// ============================================================================
// 2. ADMIN ENDPOINT: List Subscribers (Paginated, Searchable, Filterable)
// ============================================================================

router.get('/subscribers', authenticate, requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = req.query.search ? String(req.query.search).trim().toLowerCase() : '';
    const statusFilter = req.query.status ? String(req.query.status).trim().toUpperCase() : 'ALL';

    const where: any = {};

    if (statusFilter === 'ACTIVE' || statusFilter === 'UNSUBSCRIBED') {
      where.status = statusFilter;
    }

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    const [subscribers, totalCount, activeCount, unsubscribedCount, totalOverall] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { subscribedAt: 'desc' },
      }),
      prisma.newsletterSubscriber.count({ where }),
      prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
      prisma.newsletterSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
      prisma.newsletterSubscriber.count(),
    ]);

    res.json({
      success: true,
      subscribers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      counts: {
        total: totalOverall,
        active: activeCount,
        unsubscribed: unsubscribedCount,
      },
    });
  } catch (error: any) {
    console.error('[Newsletter Subscribers API] Error:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch newsletter subscribers.' });
  }
});

// ============================================================================
// 3. ADMIN ENDPOINT: Update Subscriber Status (Unsubscribe / Reactivate)
// ============================================================================

router.put('/subscribers/:id/status', authenticate, requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'ACTIVE' && status !== 'UNSUBSCRIBED') {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: 'Status must be either ACTIVE or UNSUBSCRIBED.',
      });
    }

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Newsletter subscriber not found.' });
    }

    const isUnsubscribing = status === 'UNSUBSCRIBED';
    const updated = await prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        status,
        ...(isUnsubscribing
          ? { unsubscribedAt: new Date() }
          : { subscribedAt: new Date(), unsubscribedAt: null }),
      },
    });

    logSecurityEvent('ACCOUNT_SUSPENDED', {
      userId: req.user!.userId,
      email: existing.email,
      role: req.user!.role,
      status: 'SUCCESS',
      reason: `Admin updated newsletter subscriber status to ${status}`,
      resourceId: existing.id,
    });

    res.json({
      success: true,
      message: `Subscriber status updated to ${status}.`,
      subscriber: updated,
    });
  } catch (error: any) {
    console.error('[Newsletter Update Subscriber Status API] Error:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to update subscriber status.' });
  }
});

// ============================================================================
// 4. ADMIN ENDPOINT: Live Stats for Dashboard KPI
// ============================================================================

router.get('/stats', authenticate, requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const [totalSubscribers, activeSubscribers, unsubscribedSubscribers] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
      prisma.newsletterSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalSubscribers,
        activeSubscribers,
        unsubscribedSubscribers,
      },
    });
  } catch (error: any) {
    console.error('[Newsletter Stats API] Error:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch newsletter statistics.' });
  }
});

export default router;
