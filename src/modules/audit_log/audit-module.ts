import { AuditRepository } from './audit-repository.js';
import { createAuditMiddleware } from './audit-middleware.js';
import { dbAdmin } from '../../shared/db/db.js';

export function AuditModule() {
  const repository = new AuditRepository(dbAdmin);
  const middleware = createAuditMiddleware(repository);

  return { middleware };
}