import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Central Express Global Error Handling Middleware.
 * Preserves explicit HTTP semantics (400, 401, 403, 404, 409, 429, 503) while sanitizing 
 * unexpected 500 errors to prevent leaking internal stack traces, SQL, or secrets.
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || 'N/A';
  
  // Determine HTTP status code
  let statusCode = err.statusCode || (res.statusCode && res.statusCode >= 400 ? res.statusCode : 500);

  if (statusCode < 400) {
    statusCode = 500;
  }

  const isClientError = statusCode >= 400 && statusCode < 500;
  
  let errorCode = err.code || (
    statusCode === 404 ? 'NOT_FOUND' : 
    statusCode === 401 ? 'UNAUTHORIZED' : 
    statusCode === 403 ? 'FORBIDDEN' : 
    statusCode === 409 ? 'CONFLICT' :
    statusCode === 429 ? 'TOO_MANY_REQUESTS' : 
    statusCode === 503 ? 'SERVICE_UNAVAILABLE' :
    'INTERNAL_ERROR'
  );
  
  let userMessage = isClientError 
    ? err.message || 'Invalid request' 
    : 'An unexpected internal error occurred. Please try again later.';

  // Log full error details server-side securely
  console.error(`[ERROR] [${new Date().toISOString()}] [ReqID: ${requestId}] [${req.method} ${req.originalUrl}] Status: ${statusCode} - ${err.message}`);
  if (!isClientError && err.stack) {
    console.error(`[STACK TRACE] [ReqID: ${requestId}]:`, err.stack);
  }

  res.status(statusCode).json({
    error: errorCode,
    message: userMessage,
    requestId,
  });
}
