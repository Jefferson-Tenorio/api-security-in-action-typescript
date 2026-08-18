import type { MigrationBuilder } from 'node-pg-migrate';

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE spaces ADD COLUMN owner VARCHAR(50);

    UPDATE spaces
    SET owner = u.username
    FROM space_members sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.space_id = spaces.id AND sm.role = 'owner';

    DROP TABLE space_members;
  `);
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE space_members (
      space_id INT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'member')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (space_id, user_id)
    );

    INSERT INTO space_members (space_id, user_id, role)
    SELECT s.id, u.id, 'owner'
    FROM spaces s
    JOIN users u ON u.username = s.owner;

    ALTER TABLE spaces DROP COLUMN owner;
  `);
}