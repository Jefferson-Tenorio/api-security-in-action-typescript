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

function logError(statusCode: number, message: string, stack?: string): void {
  console.error(
    JSON.stringify({
      level: 'error',
      message,
      requestId: requestContext.getRequestId(),
      stack,
      statusCode,
      timestamp: new Date().toISOString(),
      type: 'error',
    }),
  );
}

export const globalErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof HttpError) {
    logError(error.statusCode, error.message);
    return res.status(error.statusCode).json(buildErrorBody(error));
  }

  if (isBodyParserError(error)) {
    const message =
      error.type === 'entity.too.large'
        ? 'Payload too large'
        : 'Malformed request body';
    logError(error.status, message);
    return res.status(error.status).json({ error: { message } });
  }

  const stack = error instanceof Error ? error.stack : undefined;
  logError(500, 'Internal server error', stack);
  return res.status(500).json({
    error: { message: 'Internal server error' },
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
