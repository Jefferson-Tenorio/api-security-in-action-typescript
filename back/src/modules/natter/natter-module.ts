import type { RequestHandler } from 'express';

import type { TokenPayload } from '../auth/jwt-service.js';

import { requestContext } from '../../shared/context/request-context.js';
import { dbAdmin } from '../../shared/db/db.js';
import { HttpError } from '../../shared/error/http-error.js';
import { NatterController } from './natter-controller.js';
import { NatterRepository } from './natter-repository.js';
import { NatterRouter } from './natter-router.js';
import { NatterService } from './natter-service.js';

export function NatterModule(authenticate: RequestHandler) {
  const repository = new NatterRepository(dbAdmin);
  const service = new NatterService(repository, getCurrentUser);
  const controller = new NatterController(service);
  const router = NatterRouter(controller, authenticate);

  return {
    controller,
    repository,
    router,
    service,
  };
}

function getCurrentUser(): TokenPayload {
  const user = requestContext.getUser();
  if (!user) throw HttpError.unauthorized('Not authenticated');
  return user;
}