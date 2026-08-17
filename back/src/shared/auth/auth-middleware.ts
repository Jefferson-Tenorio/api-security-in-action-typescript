import type { NextFunction, Request, Response } from 'express';

import { requestContext } from '../context/request-context.js';
import { HttpError } from '../error/http-error.js';
import { verifyToken } from './jwt-service.js';

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies.token;
  if (!token) return next(HttpError.unauthorized('Não autenticado'))

  try {
    const user = verifyToken(token);
    const store = requestContext.getStore();
  if (!store) return next(new Error('RequestContext não inicializado'));
  store.user = user;
    next();
  } catch {
    return next(HttpError.unauthorized('Token inválido ou expirado'));
  }
}
