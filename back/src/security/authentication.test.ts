import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { App } from '../app.js';

const app = new App().instance;

describe('Authentication — endpoint matrix', () => {
  it.each([
    ['GET', '/natter/message'],
    ['GET', '/natter/message/1'],
    ['POST', '/natter/message'],
    ['PUT', '/natter/message/1'],
    ['DELETE', '/natter/message/1'],
    ['GET', '/natter/space'],
    ['GET', '/natter/space/1'],
    ['POST', '/natter/space'],
    ['DELETE', '/natter/space/1'],
  ] as const)('%s %s without cookie → 401', async (method, path) => {
    const res = await request(app)[method.toLowerCase() as 'get'](path);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Not authenticated');
  });

  it('rejects a garbage token cookie with 401', async () => {
    const res = await request(app)
      .get('/natter/space')
      .set('Cookie', 'token=not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired token');
  });

  it('rejects a malformed JWT structure with 401', async () => {
    const res = await request(app)
      .get('/natter/space')
      .set('Cookie', 'token=abc.def.ghi');

    expect(res.status).toBe(401);
  });
});