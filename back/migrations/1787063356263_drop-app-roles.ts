import type { MigrationBuilder } from 'node-pg-migrate';

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE ROLE app_read_write;
    CREATE ROLE app_admin;
    CREATE USER app_user PASSWORD 'user';
    CREATE USER admin_user PASSWORD 'admin';
    GRANT app_read_write TO app_user;
    GRANT app_admin TO admin_user;
  `);
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_read_write, app_admin;
    REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM app_read_write, app_admin;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM app_read_write;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM app_admin;
    DROP USER IF EXISTS app_user;
    DROP USER IF EXISTS admin_user;
    DROP ROLE IF EXISTS app_read_write;
    DROP ROLE IF EXISTS app_admin;
  `);
}