import postgres from 'postgres';

export type SecurityAction =
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGOUT'
  | 'AUTHZ_DENIED'
  | 'RESOURCE_CREATED'
  | 'RESOURCE_DELETED'
  | 'RESOURCE_UPDATED';

export interface SecurityEvent {
  action: SecurityAction;
  actor: string;
  outcome: SecurityOutcome;
  requestId?: string | undefined;
  resource?: string | undefined;
}

export interface SecurityEventRepository {
  deleteOlderThan(days: number): Promise<void>;
  insert(event: SecurityEvent): Promise<void>;
}

export type SecurityOutcome = 'failure' | 'success';

export class PgSecurityEventRepository implements SecurityEventRepository {
  constructor(private readonly conn: postgres.Sql) {}

  async deleteOlderThan(days: number): Promise<void> {
    await this.conn`
      DELETE FROM security_events
      WHERE created_at < now() - make_interval(days => ${days})
    `;
  }

  async insert(event: SecurityEvent): Promise<void> {
    await this.conn`
      INSERT INTO security_events (actor, action, outcome, request_id, resource)
      VALUES (
        ${event.actor},
        ${event.action},
        ${event.outcome},
        ${event.requestId ?? null},
        ${event.resource ?? null}
      )
    `;
  }
}