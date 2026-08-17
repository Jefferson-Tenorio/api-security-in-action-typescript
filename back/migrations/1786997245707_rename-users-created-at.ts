import type { MigrationBuilder } from 'node-pg-migrate';

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.renameColumn('users', 'created_at', 'createdat');
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.renameColumn('users', 'createdat', 'created_at');
}