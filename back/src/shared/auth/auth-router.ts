import { Router } from 'express';

import { AuthController } from './auth-controller.js';

export function AuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);

  return router;
}
