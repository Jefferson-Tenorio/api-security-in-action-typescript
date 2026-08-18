import type { NextFunction, Request, Response } from 'express';

import type { TokenService } from './jwt-service.js';

import { requestContext } from '../../shared/context/request-context.js';
import { HttpError } from '../../shared/error/http-error.js';

export function createAuthenticate(tokenService: TokenService) {
  return function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const token = req.cookies.token;
    if (!token) return next(HttpError.unauthorized('Not authenticated'));

    try {
      const user = tokenService.verify(token);
      const store = requestContext.getStore();
      if (!store) return next(new Error('RequestContext not initialized'));
      store.user = user;
      next();
    } catch {
      return next(HttpError.unauthorized('Invalid or expired token'));
    }
  };
}