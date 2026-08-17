import bcrypt from 'bcrypt';

import { HttpError } from '../error/http-error.js';
import { signToken } from './jwt-service.js';
import { UserRepository } from './user-repository.js';

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  async login(username: string, password: string) {
    const user = await this.userRepository.findByUsername(username);
    if (!user) throw HttpError.unauthorized('Credenciais inválidas');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw HttpError.unauthorized('Credenciais inválidas');

    const token = signToken({ userId: user.id, username: user.username });
    return token;
  }

  async register(username: string, password: string) {
    const exists = await this.userRepository.findByUsername(username);
    if (exists) throw HttpError.conflict('Username já existe');

    //bcrypt é uma função de hash unidirecional e intencionalemente lenta, projetada para armazenar senhas com segurança.
    const hashed = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create(username, hashed);

    return { id: user.id, username: user.username };
  }
}
