import { Router } from 'express';

import { loginLimiter, writeLimiter } from '../../shared/utils/rate-limit.js';
import { AuthController } from './auth-controller.js';

export function AuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post('/register', writeLimiter, controller.register);
  router.post('/login', loginLimiter, controller.login);
  router.post('/logout', controller.logout);

  return router;
}