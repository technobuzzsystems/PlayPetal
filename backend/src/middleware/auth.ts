import { Request, Response, NextFunction } from 'express';
import { sessionStore, Session } from '../data/sessionStore';
import { logSecurityEvent } from '../utils/security';

export const COOKIE_NAME = 'pp_session';

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
}

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: Session;
      sessionId?: string;
      invalidSession?: boolean;
    }
  }
}

/**
 * Lightweight, zero-dependency cookie parser helper
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(';');
  for (let pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.substring(0, idx).trim();
    let val = pair.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

/**
 * Extracts session ID from Authorization header (primary for API/dashboard requests) or HttpOnly cookie
 */
export function extractSessionId(req: Request): string | null {
  // 1. Primary: Explicit Authorization header (e.g. Bearer <sessionId>)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    if (bearerToken) {
      return bearerToken;
    }
  }

  // 2. Fallback: HttpOnly Cookie
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[COOKIE_NAME]) {
    return cookies[COOKIE_NAME];
  }

  return null;
}

/**
 * Authenticates session if present, attaching user to request.
 * Does not reject unauthenticated requests.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = extractSessionId(req);
  if (!sessionId) {
    req.user = undefined;
    req.sessionId = undefined;
    req.invalidSession = false;
    return next();
  }

  const session = await sessionStore.get(sessionId);
  if (!session) {
    req.user = undefined;
    req.sessionId = sessionId;
    req.invalidSession = true;
    return next();
  }

  // Touch session to record activity
  sessionStore.touch(sessionId);
  req.user = session;
  req.sessionId = sessionId;
  req.invalidSession = false;
  next();
}

/**
 * Rejects unauthenticated requests with 401 Unauthorized
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void | any {
  if (req.invalidSession || !req.user || !req.sessionId) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in to continue.',
    });
  }
  next();
}

/**
 * Enforces role-based authorization
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void | any => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        ip: req.ip,
        status: 'WARNING',
        reason: `Role '${req.user.role}' attempted to access route requiring: [${roles.join(', ')}]`,
      });

      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied: you do not possess the required permissions.',
      });
    }

    next();
  };
}

/**
 * Enforces account status restrictions (ACTIVE vs SUSPENDED vs DISABLED)
 */
export async function requireActiveAccount(req: Request, res: Response, next: NextFunction): Promise<void | any> {
  if (!req.user) return next();

  if (req.user.status === 'DISABLED') {
    if (req.sessionId) {
      await sessionStore.destroy(req.sessionId);
    }
    return res.status(403).json({
      error: 'ACCOUNT_DISABLED',
      message: 'Your account has been disabled. Please contact support.',
    });
  }

  if (req.user.status === 'SUSPENDED') {
    return res.status(403).json({
      error: 'ACCOUNT_SUSPENDED',
      message: 'Your account is suspended. State-modifying operations are blocked.',
    });
  }

  next();
}

/**
 * Enforces vendor ownership scoping.
 * Disregards client vendorId spoofing; validates target vendorId against authenticated user's vendorId.
 */
export function requireVendorScope(req: Request, res: Response, next: NextFunction): void | any {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  // Admins can manage any vendor
  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (req.user.role !== 'VENDOR' || !req.user.vendorId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Vendor access required.' });
  }

  // Check target vendorId in route params or body
  const targetVendorId = req.params.vendorId || req.body.vendorId;
  if (targetVendorId && targetVendorId !== req.user.vendorId) {
    logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      ip: req.ip,
      status: 'WARNING',
      reason: `Vendor '${req.user.vendorId}' attempted cross-tenant access to '${targetVendorId}'`,
    });

    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied: You cannot access or modify another vendor\'s resources.',
    });
  }

  next();
}
