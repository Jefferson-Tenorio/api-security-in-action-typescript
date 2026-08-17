import type { MigrationBuilder } from 'node-pg-migrate';

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
      DROP TABLE audit_logs;
    `);
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE audit_logs (
      audit_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      request_id VARCHAR(255),
      method VARCHAR(255) NOT NULL,
      path VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NULL,
      status INT NULL,
      audit_time TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}
