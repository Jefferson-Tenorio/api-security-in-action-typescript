import fs from 'fs';

import { env } from '../../config/env.js';
import { dbUser } from '../../shared/db/db.js';
import { AuthController } from './auth-controller.js';
import { AuthRouter } from './auth-router.js';
import { AuthService } from './auth-service.js';
import { createAuthenticate } from './authenticate-middleware.js';
import { JwtService } from './jwt-service.js';
import { PgTokenDenylistRepository } from './token-denylist-repository.js';
import { PgUserRepository } from './user-repository.js';

export function AuthModule() {
  const repository = new PgUserRepository(dbUser);
  const denylist = new PgTokenDenylistRepository(dbUser);
  const tokenService = new JwtService(
    fs.readFileSync(env.jwt.privateKeyPath),
    fs.readFileSync(env.jwt.publicKeyPath),
    env.jwt.expiresInMs,
    env.jwt.issuer,
    env.jwt.audience,
  );
  const service = new AuthService(repository, tokenService, denylist);
  const controller = new AuthController(service);
  const router = AuthRouter(controller);
  const authenticate = createAuthenticate(tokenService, denylist);

  return {
    authenticate,
    controller,
    repository,
    router,
    service,
  };
}