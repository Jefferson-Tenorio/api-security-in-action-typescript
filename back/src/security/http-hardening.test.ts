import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { App } from '../app.js';
import { dbUser } from '../shared/db/db.js';

const app = new App().instance;

function unique(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

describe('HTTP hardening — payload and body parsing', () => {
  it('rejects payloads above the explicit 100kb limit with 413', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ filler: 'x'.repeat(200_000), password: 'SenhaForte123!', username: unique('payload') });

    expect(res.status).toBe(413);
    expect(res.body.error.message).toBe('Payload too large');
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username": ');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed request body');
  });

  it('rejects non-JSON content-type on json routes with 400', async () => {
    const res = await request(app)
      .post('/v1/auth/login')
      .set('Content-Type', 'text/plain')
      .send('not json');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid payload');
  });
});

afterAll(async () => {
  await dbUser`DELETE FROM users WHERE username LIKE 'payload_%'`;
});