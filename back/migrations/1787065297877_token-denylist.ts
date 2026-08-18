import type { MigrationBuilder } from 'node-pg-migrate';

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE token_denylist;
  `);
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE token_denylist (
      jti UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX token_denylist_expires_at_idx ON token_denylist (expires_at);
  `);
}