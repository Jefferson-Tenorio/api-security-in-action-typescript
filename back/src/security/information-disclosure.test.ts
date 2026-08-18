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
  await request(app).post('/auth/register').send({ password, username }).expect(201);
  const res = await request(app).post('/auth/login').send({ password, username }).expect(200);
  return extractCookie(res);
}

function unique(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

describe('Information disclosure — consistent error format', () => {
  it('every error status uses the {error:{message}} shape', async () => {
    const badPayload = await request(app).post('/auth/register').send({ password, username: 'ab' });
    expect(badPayload.status).toBe(400);
    expect(badPayload.body.error.message).toBeTruthy();

    const unauthenticated = await request(app).get('/natter/space');
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.message).toBeTruthy();

    const cookie = await registerAndLogin(unique('disc'));
    const missing = await request(app).get('/natter/message/999999').set('Cookie', cookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toBeTruthy();

    const username = unique('disc');
    await request(app).post('/auth/register').send({ password, username }).expect(201);
    const duplicate = await request(app).post('/auth/register').send({ password, username });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toBeTruthy();
  });

  it('does not leak whether a username exists (login 401 uniform)', async () => {
    const nonexistent = await request(app)
      .post('/auth/login')
      .send({ password, username: `ghost_${Date.now()}` });

    const username = unique('disc');
    await request(app).post('/auth/register').send({ password, username }).expect(201);
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ password: 'senha-errada', username });

    expect(nonexistent.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(nonexistent.body.error.message).toBe(wrongPassword.body.error.message);
  });
});

describe('Information disclosure — credentials never echoed', () => {
  it('register response does not include the password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password, username: unique('disc') });

    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toContain(password);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('validation error details do not echo the password value', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ password: 'curta1', username: unique('disc') });

    expect(res.status).toBe(400);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('curta1');
  });

  it('login failure response does not echo the password', async () => {
    const username = unique('disc');
    await request(app).post('/auth/register').send({ password, username }).expect(201);

    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'senha-errada', username });

    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('senha-errada');
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('successful login cookie does not expose the password in the body', async () => {
    const username = unique('disc');
    await request(app).post('/auth/register').send({ password, username }).expect(201);

    const res = await request(app).post('/auth/login').send({ password, username });

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain(password);
    const cookie = extractCookie(res);
    expect(cookie).not.toContain(password);
  });
});

afterAll(async () => {
  await dbUser`DELETE FROM users WHERE username LIKE 'disc_%'`;
});