import express from 'express';

/**
 * Route-specific large payload JSON parser middleware (10MB limit)
 * used for endpoints handling media metadata or large catalog updates.
 */
export const largePayloadJsonParser = express.json({
  limit: '50mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
});
