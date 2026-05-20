interface ValidationError {
  fields: string[];
  message: string;
}

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly validationError: ValidationError[];
  get status(): string {
    return this.statusCode >= 400 && this.statusCode < 500 ? 'fail' : 'error';
  }

  constructor(
    message: string,
    statusCode: number,
    validationError: ValidationError[] = [],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.validationError = validationError;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(
    message: string,
    errors: ValidationError[] = [],
  ): HttpError {
    return new HttpError(message, 400, errors);
  }

  static forbidden(message: string = 'Forbidden'): HttpError {
    return new HttpError(message, 403);
  }

  static internal(message: string): HttpError {
    return new HttpError(message, 500);
  }

  static notFound(message: string): HttpError {
    return new HttpError(message, 404);
  }

  static unauthorized(message: string): HttpError {
    return new HttpError(message, 401);
  }

  static conflict(message: string): HttpError {
    return new HttpError(message, 409);
  }

  static unprocessable(
    message: string,
    errors: ValidationError[] = [],
  ): HttpError {
    return new HttpError(message, 422, errors);
  }

  static tooManyRequests(message: string = 'Too many requests'): HttpError {
    return new HttpError(message, 429);
  }

  static notImplemented(message: string = 'Not implemented'): HttpError {
    return new HttpError(message, 501);
  }

  static serviceUnavailable(
    message: string = 'Service unavailable',
  ): HttpError {
    return new HttpError(message, 503);
  }
}
