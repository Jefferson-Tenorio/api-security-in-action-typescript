import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { App } from '../app.js';
import { dbUser } from '../shared/db/db.js';

const app = new App().instance;
const password = 'SenhaForte123!';

function unique(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

describe('Input validation — auth', () => {
  it('register rejects empty username with 400', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ password, username: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid payload');
    expect(res.body.error.details[0].fields).toEqual(['username']);
  });

  it('register rejects username shorter than 3 characters', async () => {
    const res = await request(app).post('/v1/auth/register').send({ password, username: 'ab' });

    expect(res.status).toBe(400);
  });

  it('register rejects username longer than 50 characters', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ password, username: 'a'.repeat(51) });

    expect(res.status).toBe(400);
  });

  it('register rejects username with invalid characters', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ password, username: 'inva lid!' });

    expect(res.status).toBe(400);
  });

  it('register rejects password shorter than 8 characters', async () => {
    const res = await request(app).post('/v1/auth/register').send({ password: 'curta1', username: unique('val') });

    expect(res.status).toBe(400);
  });

  it('register rejects password longer than 72 characters (bcrypt limit)', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ password: 'a'.repeat(73), username: unique('val') });

    expect(res.status).toBe(400);
  });

  it('register rejects unknown fields (strict schema)', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ email: 'x@x.com', password, username: unique('val') });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].fields).toEqual(['email']);
  });

  it('login rejects malformed body with 400', async () => {
    const res = await request(app).post('/v1/auth/login').send({ password });

    expect(res.status).toBe(400);
  });

  it('invalid input never reaches the database (no 500)', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ password, username: 'a'.repeat(200) });

    expect(res.status).toBe(400);
  });
});

afterAll(async () => {
  await dbUser`DELETE FROM users WHERE username LIKE 'val_%'`;
});