import type { MigrationBuilder } from 'node-pg-migrate';

// NOTE: the migration name is misleading — it creates roles, spaces and messages.
// The users table is created in 1778005676735_users.ts.

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
-- remover vínculos
REVOKE app_read_write FROM app_user;
REVOKE app_admin FROM admin_user;

-- dropar users
DROP USER app_user;
DROP USER admin_user;

-- dropar roles
DROP ROLE app_read_write;
DROP ROLE app_admin;

-- dropar tabelas
DROP TABLE messages;
DROP TABLE spaces;
    `);
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`

-- ROLES (permissões)
CREATE ROLE app_read_write;
CREATE ROLE app_admin;

-- USERS (login)
CREATE USER app_user PASSWORD 'user';
CREATE USER admin_user PASSWORD 'admin';

-- vincular users às roles
GRANT app_read_write TO app_user;
GRANT app_admin TO admin_user;

    CREATE TABLE spaces (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        owner VARCHAR(50) NOT NULL
    );
    CREATE TABLE messages(
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        author VARCHAR(50) NOT NULL,
        msg_time TIMESTAMPTZ DEFAULT NOW(),
        msg_text VARCHAR(100) NOT NULL,
        space_id INT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE
    );

    GRANT SELECT, INSERT ON spaces, messages TO app_read_write;
    GRANT SELECT, INSERT, DELETE, UPDATE ON spaces, messages TO app_admin;


    -- 6. sequences (muito importante)
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_read_write;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_admin;

    -- 7. default privileges (para futuras tabelas)
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT ON TABLES TO app_read_write;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_admin;

  `);
}
