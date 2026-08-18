import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { App } from '../app.js';

const app = new App().instance;

describe('Authentication — endpoint matrix', () => {
  it.each([
    ['GET', '/v1/natter/message'],
    ['GET', '/v1/natter/message/1'],
    ['POST', '/v1/natter/message'],
    ['PUT', '/v1/natter/message/1'],
    ['DELETE', '/v1/natter/message/1'],
    ['GET', '/v1/natter/space'],
    ['GET', '/v1/natter/space/1'],
    ['POST', '/v1/natter/space'],
    ['DELETE', '/v1/natter/space/1'],
  ] as const)('%s %s without cookie → 401', async (method, path) => {
    const res = await request(app)[method.toLowerCase() as 'get'](path);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Not authenticated');
  });

  it('rejects a garbage token cookie with 401', async () => {
    const res = await request(app)
      .get('/v1/natter/space')
      .set('Cookie', 'token=not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired token');
  });

  it('rejects a malformed JWT structure with 401', async () => {
    const res = await request(app)
      .get('/v1/natter/space')
      .set('Cookie', 'token=abc.def.ghi');

    expect(res.status).toBe(401);
  });
});