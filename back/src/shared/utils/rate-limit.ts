import type { NextFunction, Request, Response } from 'express';

import { rateLimit } from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

const bypass = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

function createLimiter(limit: number) {
  if (isTest) return bypass;
  return rateLimit({
    legacyHeaders: false,
    limit,
    standardHeaders: true,
    windowMs: 15 * 60 * 1000,
  });
}

export const defaultLimiter = createLimiter(100);
export const writeLimiter = createLimiter(20);