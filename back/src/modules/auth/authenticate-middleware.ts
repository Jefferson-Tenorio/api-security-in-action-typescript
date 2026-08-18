import type { NextFunction, Request, Response } from 'express';

import type { TokenService } from './jwt-service.js';
import type { TokenDenylistRepository } from './token-denylist-repository.js';

import { requestContext } from '../../shared/context/request-context.js';
import { HttpError } from '../../shared/error/http-error.js';

export function createAuthenticate(
  tokenService: TokenService,
  denylist: TokenDenylistRepository,
) {
  return async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = req.cookies.token;
    if (!token) return next(HttpError.unauthorized('Not authenticated'));

    try {
      const user = tokenService.verify(token);
      if (await denylist.isDenied(user.jti)) {
        return next(HttpError.unauthorized('Invalid or expired token'));
      }
      const store = requestContext.getStore();
      if (!store) return next(new Error('RequestContext not initialized'));
      store.user = user;
      next();
    } catch {
      return next(HttpError.unauthorized('Invalid or expired token'));
    }
  };
}