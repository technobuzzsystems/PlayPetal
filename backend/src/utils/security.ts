import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

// ============================================================================
// 1. SECURITY & OPERATIONAL AUDIT LOGGER
// ============================================================================

export type SecurityAuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'ADMIN_LOGIN'
  | 'VENDOR_LOGIN'
  | 'ACCOUNT_CREATED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_MIGRATED'
  | 'ACCOUNT_SUSPENDED'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SELLER_APPROVED'
  | 'SELLER_SUSPENDED'
  | 'SELLER_REACTIVATED'
  | 'SELLER_REJECTED'
  | 'MASTER_PRODUCT_CREATED'
  | 'MASTER_PRODUCT_UPDATED'
  | 'MASTER_PRODUCT_APPROVED'
  | 'MASTER_PRODUCT_REJECTED'
  | 'OFFER_APPROVED'
  | 'OFFER_REJECTED'
  | 'OFFER_SUSPENDED'
  | 'OFFER_PAUSED'
  | 'OFFER_REACTIVATED'
  | 'INVENTORY_ADJUSTED'
  | 'SUBORDER_STATUS_CHANGED'
  | 'REVIEW_MODERATED'
  | 'FEEDBACK_MODERATED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_CAPTURED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED'
  | 'PAYMENT_WEBHOOK_VERIFIED'
  | 'PAYMENT_WEBHOOK_REPLAY'
  | 'PAYMENT_RECONCILIATION_MISMATCH'
  | 'SHIPMENT_CREATED'
  | 'AWB_ASSIGNED'
  | 'SHIPMENT_STATUS_UPDATED'
  | 'SHIPMENT_DELIVERED'
  | 'SHIPMENT_CANCELLED'
  | 'SHIPMENT_FAILED'
  | 'SHIPPING_WEBHOOK_VERIFIED'
  | 'SHIPPING_WEBHOOK_REPLAY'
  | 'SHIPPING_RECONCILIATION_MISMATCH'
  | 'SETTLEMENT_CALCULATED'
  | 'SETTLEMENT_CREATED'
  | 'SETTLEMENT_FAILED'
  | 'LEDGER_ENTRY_CREATED'
  | 'PAYOUT_CREATED'
  | 'PAYOUT_PROCESSING'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'PAYOUT_RETRY'
  | 'SETTLEMENT_RECONCILIATION_RUN'
  | 'FINANCIAL_ADJUSTMENT'
  | 'RETURN_REQUEST_CREATED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURN_STATUS_UPDATED'
  | 'RETURN_INSPECTED'
  | 'REVERSE_SHIPMENT_DISPATCHED'
  | 'RETURN_REVERSE_DISPATCHED'
  | 'REVERSE_TRACKING_UPDATED'
  | 'REFUND_EXECUTED'
  | 'REFUND_PROCESSED'
  | 'REFUND_FAILED'
  | 'REFUND_RECONCILIATION_RUN';

export interface AuditLogDetails {
  userId?: string;
  email?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING' | 'INFO';
  reason?: string;
  resourceId?: string;
}

export function logSecurityEvent(event: SecurityAuditEvent, details: AuditLogDetails): void {
  const timestamp = new Date().toISOString();
  // Sanitize fields to guarantee no credentials, hashes, or tokens are logged
  const safeDetails = {
    event,
    timestamp,
    status: details.status,
    userId: details.userId || 'anonymous',
    email: details.email ? details.email.toLowerCase().trim() : undefined,
    role: details.role,
    ip: details.ip,
    reason: details.reason,
    resourceId: details.resourceId,
  };

  console.log(`[SECURITY AUDIT] ${timestamp} [${event}] [${details.status}] User: ${safeDetails.userId || safeDetails.email || 'N/A'} - ${details.reason || ''}`);

  // Asynchronous persistent database logging to SecurityAuditLog table
  // Safe failure policy: audit persistence failure must never disrupt business transactions
  try {
    let validUserId: string | null = null;
    if (details.userId && details.userId !== 'anonymous' && details.userId !== 'guest' && !details.userId.startsWith('vendor-')) {
      validUserId = details.userId;
    }

    const logData: any = {
      event,
      status: details.status,
      email: safeDetails.email || null,
      role: details.role || null,
      ip: details.ip || null,
      userAgent: details.userAgent || null,
      reason: details.reason ? String(details.reason).slice(0, 500) : null,
      resourceId: details.resourceId || null,
    };

    if (validUserId) {
      logData.userId = validUserId;
    }

    prisma.securityAuditLog.create({ data: logData }).catch(() => {
      // Fallback without userId in case foreign key fails
      if (logData.userId) {
        delete logData.userId;
        prisma.securityAuditLog.create({ data: logData }).catch(() => {});
      }
    });
  } catch (err) {
    // Non-blocking
  }
}

export const logSecurityAudit = logSecurityEvent;

// ============================================================================
// 2. IN-MEMORY AUTHENTICATION RATE LIMITER
// ============================================================================

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export function createAuthRateLimiter(options: {
  windowMs: number; // e.g. 15 * 60 * 1000 (15 minutes)
  max: number;      // e.g. 10 attempts
  message?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      rateLimitStore.set(key, record);
      return next();
    }

    record.count++;
    if (record.count > options.max) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip,
        status: 'WARNING',
        reason: `Exceeded ${options.max} attempts in ${options.windowMs / 1000}s on ${req.path}`,
      });
      return res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: options.message || `Too many requests. Please try again in ${retryAfterSec} seconds.`,
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

// Pre-configured rate limiters
export function resetRateLimits(): void {
  rateLimitStore.clear();
}

export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return require('crypto').timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export const loginRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please wait a few minutes before trying again.',
});

export const registrationRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: 'Too many account registrations from this network. Please try again later.',
});

// ============================================================================
// 3. INPUT VALIDATION HELPERS
// ============================================================================

export function isValidEmail(email: any): boolean {
  if (typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length < 5 || clean.length > 254) return false;
  // RFC 5322 compliant regex pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(clean);
}

export function validatePassword(password: any): { valid: boolean; reason?: string } {
  if (typeof password !== 'string') {
    return { valid: false, reason: 'Password must be a string.' };
  }
  if (password.length < 6) {
    return { valid: false, reason: 'Password must be at least 6 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password exceeds maximum length limit.' };
  }
  return { valid: true };
}

// ============================================================================
// 4. CENTRALIZED SENSITIVE DATA SANITIZATION
// ============================================================================

export function sanitizeCustomer(customer: any): any {
  if (!customer || typeof customer !== 'object') return customer;
  const { password, passwordHash, ...safe } = customer;
  const phone = customer.customerProfile?.phone || customer.phone || undefined;
  const addresses = customer.customerProfile?.addresses || customer.addresses || undefined;
  const playPoints = customer.customerProfile?.playPoints !== undefined ? customer.customerProfile.playPoints : (customer.playPoints || 50);
  return { ...safe, phone, addresses, playPoints, role: customer.role || 'CUSTOMER' };
}

export function sanitizeVendor(vendor: any): any {
  if (!vendor || typeof vendor !== 'object') return vendor;
  const { password, passwordHash, activationToken, ...safe } = vendor;
  return { ...safe, role: vendor.role || 'VENDOR' };
}

export function sanitizeSystemUser(user: any): any {
  if (!user || typeof user !== 'object') return user;
  const { passwordHash, ...safe } = user;
  return safe;
}

export function sanitizeOrder(order: any, options?: { includeGuestToken?: boolean }): any {
  if (!order || typeof order !== 'object') return order;
  const copy = { ...order };
  if (!options?.includeGuestToken) {
    delete copy.guestAccessToken;
  }
  return copy;
}
