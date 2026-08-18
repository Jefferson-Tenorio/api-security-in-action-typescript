import { Router } from 'express';

import { writeLimiter } from '../../shared/utils/rate-limit.js';
import { AuthController } from './auth-controller.js';

export function AuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post('/register', writeLimiter, controller.register);
  router.post('/login', writeLimiter, controller.login);
  router.post('/logout', controller.logout);

  return router;
}