import crypto from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { App } from '../app.js';
import { env } from '../config/env.js';
import { dbUser } from '../shared/db/db.js';

const app = new App().instance;
const password = 'SenhaForte123!';
const privateKey = fs.readFileSync(env.jwt.privateKeyPath);
const probeUser = {
  userId: '11111111-1111-1111-1111-111111111111',
  username: 'jwt_probe',
};

function extractCookie(res: request.Response): string {
  const header = res.headers['set-cookie'];
  const cookie = Array.isArray(header) ? header[0] : header;
  if (!cookie) throw new Error('No set-cookie header');
  return cookie.split(';')[0];
}

function signWithRealKey(
  options: jwt.SignOptions = {},
  payload: Record<string, unknown> = probeUser,
): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    audience: env.jwt.audience,
    expiresIn: '5m',
    issuer: env.jwt.issuer,
    ...options,
  });
}

describe('JWT claims — signature, integrity and issuer/audience', () => {
  it('rejects a token signed with a different key (401)', async () => {
    const { privateKey: otherKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const token = jwt.sign(probeUser, otherKey, {
      algorithm: 'RS256',
      audience: env.jwt.audience,
      expiresIn: '5m',
      issuer: env.jwt.issuer,
    });

    const res = await request(app)
      .get('/natter/space')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired token');
  });

  it('rejects a token with tampered payload (401)', async () => {
    const [header, _payload, signature] = signWithRealKey().split('.');
    const tampered = Buffer.from(
      JSON.stringify({ ...probeUser, username: 'hacked' }),
    ).toString('base64url');

    const res = await request(app)
      .get('/natter/space')
      .set('Cookie', `token=${header}.${tampered}.${signature}`);

    expect(res.status).toBe(401);
  });

  it('rejects an expired token (401)', async () => {
    const token = signWithRealKey({ expiresIn: -60 });

    const res = await request(app)
      .get('/natter/space')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
  });

  it('rejects a token with wrong issuer (401)', async () => {
    const token = signWithRealKey({ issuer: 'evil-issuer' });

    const res = await request(app)
      .get('/natter/space')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired token');
  });

  it('rejects a token with wrong audience (401)', async () => {
    const token = signWithRealKey({ audience: 'evil-audience' });

    const res = await request(app)
      .get('/natter/space')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired token');
  });

  it('issues tokens with iss, aud and jti claims', async () => {
    const username = `jwt_${Date.now()}`;
    await request(app)
      .post('/auth/register')
      .send({ password, username })
      .expect(201);
    const res = await request(app)
      .post('/auth/login')
      .send({ password, username })
      .expect(200);

    const cookie = extractCookie(res);
    const token = cookie.replace('token=', '');
    const decoded = jwt.decode(token) as jwt.JwtPayload;

    expect(decoded.iss).toBe(env.jwt.issuer);
    expect(decoded.aud).toBe(env.jwt.audience);
    expect(decoded.jti).toBeTruthy();
    expect(decoded.userId).toBeTruthy();
    expect(decoded.username).toBe(username);
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

afterAll(async () => {
  await dbUser`DELETE FROM users WHERE username LIKE 'jwt_%'`;
});
