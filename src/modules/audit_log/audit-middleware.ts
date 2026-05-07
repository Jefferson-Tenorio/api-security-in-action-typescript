// audit.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { requestContext } from '../../shared/context/request-context.js';
import { AuditRepository } from './audit-repository.js';

export function createAuditMiddleware(repository: AuditRepository) {
  return function audit(req: Request, res: Response, next: NextFunction) {
    const store = requestContext.getStore();
    const requestId = store?.requestId;

    res.on('finish', async () => {  // dispara quando a resposta é enviada
        const requestId = store?.requestId ?? 'unknown';      
        try {
        await repository.insert({
          requestId,
          method:   req.method,
          path:     req.path,
          userId:   store?.user?.userId ?? 'anonymous',
          status:   String(res.statusCode),
        });
      } catch (err) {
        console.error('Audit log falhou:', err);
      }
    });

    next();
  };
}