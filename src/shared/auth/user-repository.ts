import { dbUser } from '../db/db.js';

interface User {
  id: string;
  username: string;
  password: string;
  created_at: Date;
}

export class UserRepository {
  async findByUsername(username: string): Promise<User | null> {
    const [user] = await dbUser<User[]>`
      SELECT * FROM users WHERE username = ${username}
    `;
    return user ?? null;
  }

  async create(username: string, hashedPassword: string): Promise<User> {
    const [user] = await dbUser<User[]>`
      INSERT INTO users (username, password)
      VALUES (${username}, ${hashedPassword})
      RETURNING * 
    `;
    return user as User;
  }
}
