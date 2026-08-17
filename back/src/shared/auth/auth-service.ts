import bcrypt from 'bcrypt';

import { HttpError } from '../error/http-error.js';
import { signToken } from './jwt-service.js';
import { UserRepository } from './user-repository.js';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async login(username: string, password: string) {
    const user = await this.userRepository.findByUsername(username);
    if (!user) throw HttpError.unauthorized('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw HttpError.unauthorized('Invalid credentials');

    const token = signToken({ userId: user.id, username: user.username });
    return token;
  }

  async register(username: string, password: string) {
    const exists = await this.userRepository.findByUsername(username);
    if (exists) throw HttpError.conflict('Username already exists');

    // bcrypt is a one-way hash function that is intentionally slow,
    // designed to store passwords securely.
    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create(username, hashed);

    return { id: user.id, username: user.username };
  }
}
