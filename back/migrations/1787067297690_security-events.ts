import type { MigrationBuilder } from 'node-pg-migrate';

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP TABLE security_events;
  `);
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE security_events (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      actor VARCHAR(255) NOT NULL,
      action VARCHAR(50) NOT NULL,
      outcome VARCHAR(20) NOT NULL,
      resource VARCHAR(255),
      request_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX security_events_action_idx ON security_events (action);
    CREATE INDEX security_events_created_at_idx ON security_events (created_at);
  `);
}