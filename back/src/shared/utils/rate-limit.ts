import { rateLimit } from 'express-rate-limit';

export const defaultLimiter = rateLimit({
  legacyHeaders: false,
  limit: 100,
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

export const writeLimiter = rateLimit({
  legacyHeaders: false,
  limit: 20, // POST/PUT/DELETE mais restrito
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});
