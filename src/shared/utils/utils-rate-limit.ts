import { rateLimit } from 'express-rate-limit'

export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
})

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // POST/PUT/DELETE mais restrito
  standardHeaders: true,
  legacyHeaders: false,
});