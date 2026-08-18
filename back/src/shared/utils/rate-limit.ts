import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { rateLimit } from 'express-rate-limit';

import { env } from '../../config/env.js';
import { requestContext } from '../context/request-context.js';
import { HttpError } from '../error/http-error.js';

const WINDOW_MS = 15 * 60 * 1000;

const bypass = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

function createLimiter(limit: number): RequestHandler {
  if (!env.rateLimitEnabled) return bypass;
  return rateLimit({
    handler: (_req, res, next, options) => {
      res.set('Retry-After', String(Math.ceil(options.windowMs / 1000)));
      next(HttpError.tooManyRequests('Too many requests'));
    },
    keyGenerator,
    legacyHeaders: false,
    limit,
    standardHeaders: true,
    windowMs: WINDOW_MS,
  });
}

function createLoginLimiter(limit: number): RequestHandler {
  if (!env.rateLimitEnabled) return bypass;
  return rateLimit({
    handler: (_req, res, next, options) => {
      res.set('Retry-After', String(Math.ceil(options.windowMs / 1000)));
      next(HttpError.tooManyRequests('Too many requests'));
    },
    keyGenerator: loginKeyGenerator,
    legacyHeaders: false,
    limit,
    standardHeaders: true,
    windowMs: WINDOW_MS,
  });
}

function keyGenerator(req: Request): string {
  const userId = requestContext.getUser()?.userId;
  return userId ?? req.ip ?? 'unknown';
}

function loginKeyGenerator(req: Request): string {
  const username = typeof req.body?.username === 'string' ? req.body.username : 'unknown';
  return `login:${username}:${req.ip ?? 'unknown'}`;
}

export const defaultLimiter: RequestHandler = createLimiter(100);
export const loginLimiter: RequestHandler = createLoginLimiter(20);
export const writeLimiter: RequestHandler = createLimiter(20);
