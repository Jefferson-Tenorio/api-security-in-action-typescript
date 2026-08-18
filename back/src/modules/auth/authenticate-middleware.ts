import type { NextFunction, Request, Response } from 'express';

import type { SecurityEventLogger } from '../audit_log/security-event-logger.js';
import type { TokenService } from './jwt-service.js';
import type { TokenDenylistRepository } from './token-denylist-repository.js';

import { requestContext } from '../../shared/context/request-context.js';
import { HttpError } from '../../shared/error/http-error.js';

export function createAuthenticate(
  tokenService: TokenService,
  denylist: TokenDenylistRepository,
  events: SecurityEventLogger,
) {
  return async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = req.cookies.token;
    if (!token) {
      await deny('anonymous', req);
      return next(HttpError.unauthorized('Not authenticated'));
    }

    try {
      const user = tokenService.verify(token);
      if (await denylist.isDenied(user.jti)) {
        await deny(user.userId, req);
        return next(HttpError.unauthorized('Invalid or expired token'));
      }
      const store = requestContext.getStore();
      if (!store) return next(new Error('RequestContext not initialized'));
      store.user = user;
      next();
    } catch {
      await deny('anonymous', req);
      return next(HttpError.unauthorized('Invalid or expired token'));
    }

    async function deny(actor: string, current: Request): Promise<void> {
      await events.log({
        action: 'AUTHZ_DENIED',
        actor,
        outcome: 'failure',
        requestId: requestContext.getRequestId(),
        resource: `${current.baseUrl}${current.path}`,
      });
    }
  };
}