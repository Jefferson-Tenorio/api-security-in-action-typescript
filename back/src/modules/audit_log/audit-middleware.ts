import type { NextFunction, Request, Response } from 'express';

import { requestContext } from '../../shared/context/request-context.js';
import { AuditRepository } from './audit-repository.js';

export function createAuditMiddleware(repository: AuditRepository) {
  return function audit(req: Request, res: Response, next: NextFunction) {
    const requestId = requestContext.getRequestId() ?? 'unknown';
    const userId = requestContext.getUser()?.userId ?? 'anonymous';

    res.on('finish', async () => {
      try {
        await repository.insert({
          method: req.method,
          path: req.path,
          requestId,
          status: String(res.statusCode),
          userId,
        });
      } catch (err) {
        console.error('Audit log failed:', err);
      }
    });

    next();
  };
}
