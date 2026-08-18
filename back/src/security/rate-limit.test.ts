import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

process.env.RATE_LIMIT_ENABLED = 'true';
const { App } = await import('../app.js');
const { dbUser } = await import('../shared/db/db.js');

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

describe('Rate limit — identity-based', () => {
  it(
    'blocks login after the per-username limit with 429 and Retry-After',
    async () => {
      const username = unique('rl');
      await request(app).post('/v1/auth/register').send({ password, username }).expect(201);

      let last: request.Response;
      for (let i = 0; i < 20; i++) {
        last = await request(app)
          .post('/v1/auth/login')
          .send({ password: 'senha-errada', username });
        expect(last.status).toBe(401);
      }

      const blocked = await request(app)
        .post('/v1/auth/login')
        .send({ password: 'senha-errada', username });

      expect(blocked.status).toBe(429);
      expect(blocked.body.error.message).toBe('Too many requests');
      expect(blocked.headers['retry-after']).toBeTruthy();
    },
    30000,
  );

  it('a different username is not affected by the lockout', async () => {
    const blockedUser = unique('rl');
    await request(app)
      .post('/v1/auth/register')
      .send({ password, username: blockedUser })
      .expect(201);
    for (let i = 0; i < 21; i++) {
      await request(app)
        .post('/v1/auth/login')
        .send({ password: 'senha-errada', username: blockedUser });
    }

    const username = unique('rl');
    await request(app).post('/v1/auth/register').send({ password, username }).expect(201);
    const res = await request(app).post('/v1/auth/login').send({ password, username });

    expect(res.status).toBe(200);
  });

  it('keys authenticated writes by userId, not by IP', async () => {
    const cookieA = await registerAndLogin(unique('rl'));
    const cookieB = await registerAndLogin(unique('rl'));

    let last: request.Response;
    for (let i = 0; i < 20; i++) {
      last = await request(app)
        .post('/v1/natter/space')
        .set('Cookie', cookieA)
        .send({ name: `Sala ${i}` });
      expect(last.status).toBe(200);
    }

    const blocked = await request(app)
      .post('/v1/natter/space')
      .set('Cookie', cookieA)
      .send({ name: 'Bloqueada' });
    expect(blocked.status).toBe(429);

    const other = await request(app)
      .post('/v1/natter/space')
      .set('Cookie', cookieB)
      .send({ name: 'Outra sala' });
    expect(other.status).toBe(200);
  });
});

afterAll(async () => {
  await dbUser`DELETE FROM users WHERE username LIKE 'rl_%'`;
});