import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { requestContext } from '../context/request-context.js';

interface RequestLog {
  type: 'request';
  requestId: string;
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: unknown;
}

interface ResponseLog {
  type: 'response';
  requestId: string;
  status: number;
  durationMs: number;
  body: unknown;
}

type LogEntry = RequestLog | ResponseLog;

export function httpLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  const start = Date.now();

  requestContext.run({ requestId }, () => {
    log({
      type: 'request',
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body as unknown,
    });

    const originalJson = res.json.bind(res);
    res.json = (body: unknown): Response => {
      log({
        type: 'response',
        requestId,
        status: res.statusCode,
        durationMs: Date.now() - start,
        body,
      });
      return originalJson(body);
    };

    next();
  });
}

function formatEntry(entry: LogEntry): string {
  const isReq = entry.type === 'request';
  const color = isReq ? '\x1b[36m' : '\x1b[32m';
  const reset = '\x1b[0m';
  const label = isReq ? '[REQUEST] ' : '[RESPONSE]';

  if (isReq) {
    const e = entry as RequestLog;
    return `${color}${label}${reset} [${e.requestId}] ${e.method} ${e.path} ${JSON.stringify(e.body)}`;
  }

  const e = entry as ResponseLog;
  return `${color}${label}${reset} [${e.requestId}] ${e.status} ${e.durationMs}ms ${JSON.stringify(e.body)}`;
}

function log(entry: LogEntry): void {
  console.log(formatEntry(entry));
  if (entry.type === 'response') {
  console.log('\x1b[90m' + '·'.repeat(process.stdout.columns || 50) + '\x1b[0m')
  }
}
