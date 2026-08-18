import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { App } from '../app.js';
import { dbUser } from '../shared/db/db.js';

const app = new App().instance;
const password = 'SenhaForte123!';

function extractCookie(res: request.Response): string {
  const header = res.headers['set-cookie'];
  const cookie = Array.isArray(header) ? header[0] : header;
  if (!cookie) throw new Error('No set-cookie header');
  return cookie.split(';')[0];
}

async function registerAndLogin(username: string): Promise<string> {
  await request(app).post('/v1/auth/register').send({ password, username }).expect(201);
  const res = await request(app).post('/v1/auth/login').send({ password, username }).expect(200);
  return extractCookie(res);
}

function unique(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

describe('Token revocation — deny-list after logout', () => {
  it('rejects a token reused after logout with 401', async () => {
    const cookie = await registerAndLogin(unique('rev'));

    const before = await request(app).get('/v1/natter/space').set('Cookie', cookie).expect(200);

    await request(app).post('/v1/auth/logout').set('Cookie', cookie).expect(200);

    const after = await request(app).get('/v1/natter/space').set('Cookie', cookie);

    expect(before.status).toBe(200);
    expect(after.status).toBe(401);
    expect(after.body.error.message).toBe('Invalid or expired token');
  });

  it('logout of user A does not invalidate tokens of user B', async () => {
    const cookieA = await registerAndLogin(unique('rev_a'));
    const cookieB = await registerAndLogin(unique('rev_b'));

    await request(app).post('/v1/auth/logout').set('Cookie', cookieA).expect(200);

    const res = await request(app).get('/v1/natter/space').set('Cookie', cookieB);
    expect(res.status).toBe(200);
  });

  it('logout without a token is idempotent (200)', async () => {
    const res = await request(app).post('/v1/auth/logout');
    expect(res.status).toBe(200);
  });

  it('logging out twice with the same token stays idempotent', async () => {
    const cookie = await registerAndLogin(unique('rev'));

    await request(app).post('/v1/auth/logout').set('Cookie', cookie).expect(200);
    await request(app).post('/v1/auth/logout').set('Cookie', cookie).expect(200);

    const after = await request(app).get('/v1/natter/space').set('Cookie', cookie);
    expect(after.status).toBe(401);
  });
});

afterAll(async () => {
  await dbUser`DELETE FROM users WHERE username LIKE 'rev_%'`;
});