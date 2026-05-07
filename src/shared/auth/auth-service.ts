import bcrypt from 'bcrypt';
import { UserRepository } from './user-repository.js';
import { signToken } from './jwt-service.js';
import { HttpError } from './../error/http-error.js';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async register(username: string, password: string) {
    const exists = await this.userRepository.findByUsername(username);
    if (exists) throw HttpError.conflict('Username já existe');

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create(username, hashed);

    return { id: user.id, username: user.username };
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findByUsername(username);
    if (!user) throw HttpError.unauthorized('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw HttpError.unauthorized('Credenciais inválidas');

    const token = signToken({ userId: user.id, username: user.username });
    return token;
  }
}
