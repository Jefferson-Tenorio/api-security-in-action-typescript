import postgres from 'postgres';

export interface User {
  created_at: Date;
  id: string;
  password: string;
  username: string;
}

export interface UserRepository {
  create(username: string, hashedPassword: string): Promise<User>;
  findByUsername(username: string): Promise<null | User>;
}

export class PgUserRepository implements UserRepository {
  constructor(private readonly conn: postgres.Sql) {}

  async create(username: string, hashedPassword: string): Promise<User> {
    const [user] = await this.conn<User[]>`
      INSERT INTO users (username, password)
      VALUES (${username}, ${hashedPassword})
      RETURNING *
    `;
    return user as User;
  }

  async findByUsername(username: string): Promise<null | User> {
    const [user] = await this.conn<User[]>`
      SELECT * FROM users WHERE username = ${username}
    `;
    return user ?? null;
  }
}