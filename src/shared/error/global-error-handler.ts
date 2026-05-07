import type { NextFunction, Request, Response } from 'express';
import { requestContext } from './../context/request-context.js'
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
    console.error(red("[ERROR]   "),"["+(requestContext.getStore()?.requestId)?.trim()+"]",error.statusCode, error.message);
    return res.status(error.statusCode).json(buildErrorBody(error));
  }
  console.error('[UnexpectedError]', error);
  return res.status(500).json({
    error: 'Internal server error',
  });
};
