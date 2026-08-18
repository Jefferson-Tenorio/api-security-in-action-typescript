import type { NextFunction, Request, Response } from 'express';

import { randomUUID } from 'crypto';

import { requestContext } from './request-context.js';

export function requestContextMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  requestContext.run({ requestId: randomUUID() }, () => next());
}