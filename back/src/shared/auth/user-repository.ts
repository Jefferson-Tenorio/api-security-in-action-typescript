import { dbUser } from '../db/db.js';

interface User {
  created_at: Date;
  id: string;
  password: string;
  username: string;
}

export class UserRepository {
  async create(username: string, hashedPassword: string): Promise<User> {
    const [user] = await dbUser<User[]>`
      INSERT INTO users (username, password)
      VALUES (${username}, ${hashedPassword})
      RETURNING * 
    `;
    return user as User;
  }

  async findByUsername(username: string): Promise<null | User> {
    const [user] = await dbUser<User[]>`
      SELECT * FROM users WHERE username = ${username}
    `;
    return user ?? null;
  }
}
