// audit.middleware.ts
import type { NextFunction, Request, Response } from 'express';

import { requestContext } from '../../shared/context/request-context.js';
import { AuditRepository } from './audit-repository.js';

export function createAuditMiddleware(repository: AuditRepository) {
  return function audit(req: Request, res: Response, next: NextFunction) {
    const store = requestContext.getStore();

    res.on('finish', async () => {  // dispara quando a resposta é enviada
        const requestId = store?.requestId ?? 'unknown';      
        try {
        await repository.insert({
          method:   req.method,
          path:     req.path,
          requestId,
          status:   String(res.statusCode),
          userId:   store?.user?.userId ?? 'anonymous',
        });
      } catch (err) {
        console.error('Audit log falhou:', err);
      }
    });

    next();
  };
}