import type { NextFunction, Request, Response } from 'express';

import { requestContext } from '../context/request-context.js';
import { HttpError } from './http-error.js';

function buildErrorBody(error: HttpError) {
  return {
    error: {
      message: error.message,
      ...(error.validationError.length > 0 && {
        details: error.validationError,
      }),
    },
  };
}

const red = (text: string) => `\x1b[31m${text}\x1b[0m`;

export const globalErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof HttpError) {
    console.error(
      red('[ERROR]   '),
      '[' + requestContext.getRequestId()?.trim() + ']',
      error.statusCode,
      error.message,
    );
    return res.status(error.statusCode).json(buildErrorBody(error));
  }

  if (isBodyParserError(error)) {
    const message =
      error.type === 'entity.too.large'
        ? 'Payload too large'
        : 'Malformed request body';
    return res.status(error.status).json({ error: { message } });
  }

  console.error('[UnexpectedError]', error);
  return res.status(500).json({
    error: 'Internal server error',
  });
};

function isBodyParserError(
  error: unknown,
): error is { status: number; type: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number' &&
    'type' in error &&
    typeof (error as { type: unknown }).type === 'string' &&
    (error as { type: string }).type.startsWith('entity.')
  );
}
