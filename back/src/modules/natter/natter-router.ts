import { Router } from 'express';

import { authenticate } from '../../shared/auth/auth-middleware.js';
import { defaultLimiter, writeLimiter } from '../../shared/utils/rate-limit.js';
import { NatterController } from './natter-controller.js';

export function NatterRouter(controller: NatterController): Router {
  const router = Router();

  router.use(authenticate);

  // messages
  router.post('/message', writeLimiter, controller.createMessage);
  router.get('/message', defaultLimiter, controller.findAllMessages);
  router.get('/message/:id', defaultLimiter, controller.findByIdMessage);
  router.put('/message/:id', writeLimiter, controller.updateMessage);
  router.delete('/message/:id', writeLimiter, controller.deleteMessage);

  // spaces
  router.post('/space', writeLimiter, controller.createSpace);
  router.get('/space', defaultLimiter, controller.findAllSpace);
  router.get('/space/:id', defaultLimiter, controller.findByIdSpace);
  router.delete('/space/:id', writeLimiter, controller.deleteSpace);

  return router;
}
