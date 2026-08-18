import type { Request, Response } from 'express';

import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../app.js';
import { dbUser } from '../shared/db/db.js';
import { globalErrorHandler } from '../shared/error/global-error-handler.js';

const app = new App().instance;
const password = 'SenhaForte123!';

function jsonLines(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown>[] {
  return spy.mock.calls
    .map((call: unknown[]) => call[0])
    .filter((line: unknown): line is string => typeof line === 'string' && line.startsWith('{'))
    .map((line: string) => JSON.parse(line));
}

function unique(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

describe('Structured JSON logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.env.LOG_LEVEL = undefined;
  });

  it('logs requests and responses as one JSON line per event', async () => {
    const spy = vi.spyOn(console, 'log');

    await request(app).get('/v1/natter/space').expect(401);

    const lines = jsonLines(spy);
    expect(lines.length).toBeGreaterThan(0);

    const requestLog = lines.find(
      (line) => line.type === 'request' && line.method === 'GET',
    );
    expect(requestLog).toBeTruthy();
    expect(requestLog?.path).toBe('/v1/natter/space');
    expect(requestLog?.requestId).toBeTruthy();
    expect(requestLog?.level).toBe('info');
    expect(requestLog?.timestamp).toBeTruthy();

    const responseLog = lines.find(
      (line) => line.type === 'response' && line.status === 401,
    );
    expect(responseLog).toBeTruthy();
    expect(typeof responseLog?.durationMs).toBe('number');
  });

  it('redacts password and token from logged bodies', async () => {
    const spy = vi.spyOn(console, 'log');

    await request(app)
      .post('/v1/auth/register')
      .send({ password, username: unique('log') })
      .expect(201);

    const lines = jsonLines(spy);
    const joined = lines.map((line) => JSON.stringify(line)).join('\n');

    expect(joined).toContain('[REDACTED]');
    expect(joined).not.toContain(password);
  });

  it('suppresses info logs when LOG_LEVEL=error', async () => {
    process.env.LOG_LEVEL = 'error';
    const spy = vi.spyOn(console, 'log');

    await request(app).get('/v1/natter/space').expect(401);

    expect(jsonLines(spy)).toHaveLength(0);
  });

  it('returns 500 without leaking stack or internals to the client', () => {
    const json = vi.fn();
    const res = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    } as unknown as Response;

    globalErrorHandler(
      new Error('boom: postgres://admin:admin@db:5432/board'),
      {} as Request,
      res,
      () => {},
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: { message: 'Internal server error' } });
    const sent = JSON.stringify(json.mock.calls[0]?.[0]);
    expect(sent).not.toContain('postgres');
    expect(sent).not.toContain('stack');
  });

  it('logs unexpected errors as structured JSON with level error', () => {
    const spy = vi.spyOn(console, 'error');
    const json = vi.fn();
    const res = {
      json,
      status: vi.fn().mockReturnValue({ json }),
    } as unknown as Response;

    globalErrorHandler(new Error('boom'), {} as Request, res, () => {});

    const lines = jsonLines(spy);
    const errorLog = lines[0];
    expect(errorLog?.level).toBe('error');
    expect(errorLog?.statusCode).toBe(500);
    expect(errorLog?.stack).toBeTruthy();
  });
});

afterAll(async () => {
  await dbUser`DELETE FROM users WHERE username LIKE 'log_%'`;
});
