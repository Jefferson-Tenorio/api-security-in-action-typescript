import { dbAdmin } from '../../shared/db/db.js';
import { createAuditMiddleware } from './audit-middleware.js';
import { AuditRepository } from './audit-repository.js';

export function AuditModule() {
  const repository = new AuditRepository(dbAdmin);
  const middleware = createAuditMiddleware(repository);

  return { middleware };
}