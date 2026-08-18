import type { NextFunction, Request, Response } from 'express';

import { requestContext } from '../context/request-context.js';

const SENSITIVE_KEYS = ['authorization', 'password', 'token'];
const VALID_LEVELS = ['debug', 'error', 'info', 'warn'] as const;
type LogLevel = (typeof VALID_LEVELS)[number];
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  error: 40,
  info: 20,
  warn: 30,
};

export function httpLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = requestContext.getRequestId() ?? 'unknown';
  const start = Date.now();

  log('info', {
    body: sanitize(req.body),
    method: req.method,
    path: req.path,
    query: req.query,
    requestId,
    type: 'request',
  });

  const originalJson = res.json.bind(res);
  res.json = (body: unknown): Response => {
    log('info', {
      body,
      durationMs: Date.now() - start,
      requestId,
      status: res.statusCode,
      type: 'response',
      userId: requestContext.getUser()?.userId,
    });
    return originalJson(body);
  };

  next();
}

export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      clean[key] = SENSITIVE_KEYS.includes(key.toLowerCase())
        ? '[REDACTED]'
        : sanitize(item);
    }
    return clean;
  }
  return value;
}

function currentLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  return VALID_LEVELS.includes(raw as LogLevel) ? (raw as LogLevel) : 'info';
}

function log(level: LogLevel, fields: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel()]) return;
  const line = JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    ...fields,
  });
  if (level === 'error') console.error(line);
  else console.log(line);
}