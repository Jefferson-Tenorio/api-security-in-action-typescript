import postgres from 'postgres';

export interface TokenDenylistRepository {
  add(jti: string, userId: string, expiresAt: Date): Promise<void>;
  isDenied(jti: string): Promise<boolean>;
}

export class PgTokenDenylistRepository implements TokenDenylistRepository {
  constructor(private readonly conn: postgres.Sql) {}

  async add(jti: string, userId: string, expiresAt: Date): Promise<void> {
    await this.conn`
      INSERT INTO token_denylist (jti, user_id, expires_at)
      VALUES (${jti}, ${userId}, ${expiresAt})
      ON CONFLICT (jti) DO NOTHING
    `;
  }

  async isDenied(jti: string): Promise<boolean> {
    const [row] = await this.conn<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM token_denylist
        WHERE jti = ${jti} AND expires_at > now()
      ) AS exists
    `;
    return row?.exists ?? false;
  }
}