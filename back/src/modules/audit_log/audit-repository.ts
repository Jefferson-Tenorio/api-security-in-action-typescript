import postgres from 'postgres';

interface AuditEntry {
  method: string;
  path: string;
  requestId: string;
  status: string;
  userId: string;
}

export class AuditRepository {
  constructor(private readonly conn: postgres.Sql) {}

  async insert(data: AuditEntry): Promise<void> {
    await this.conn`
      INSERT INTO audit_logs (request_id, method, path, user_id, status)
      VALUES (
        ${data.requestId},
        ${data.method},
        ${data.path},
        ${data.userId},
        ${data.status}
      )
    `;
  }
}
