import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Middleware that attaches a unique X-Request-ID correlation ID to every incoming request.
 * Safely sanitizes client-supplied IDs or generates a cryptographically random UUID v4.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  let requestId: string;

  if (typeof incomingId === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(incomingId.trim())) {
    requestId = incomingId.trim();
  } else {
    requestId = randomUUID();
  }

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
