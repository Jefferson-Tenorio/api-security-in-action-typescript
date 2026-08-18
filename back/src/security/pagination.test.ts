import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { App } from '../app.js';
import { dbAdmin, dbUser } from '../shared/db/db.js';

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

describe('Pagination — resource limits', () => {
  it('applies a default limit to list endpoints', async () => {
    const cookie = await registerAndLogin(unique('page'));
    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', cookie)
      .send({ name: 'Sala Pag' })
      .expect(200);

    for (let i = 0; i < 25; i++) {
      await request(app)
        .post('/natter/message')
        .set('Cookie', cookie)
        .send({ content: `msg ${i}`, space_id: String(space.body.id) })
        .expect(200);
    }

    const res = await request(app).get('/natter/message').set('Cookie', cookie).expect(200);
    expect(res.body).toHaveLength(20);
  });

  it('respects limit and offset', async () => {
    const cookie = await registerAndLogin(unique('page'));
    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', cookie)
      .send({ name: 'Sala Pag2' })
      .expect(200);

    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/natter/message')
        .set('Cookie', cookie)
        .send({ content: `msg ${i}`, space_id: String(space.body.id) })
        .expect(200);
    }

    const page2 = await request(app)
      .get('/natter/message?limit=4&offset=8')
      .set('Cookie', cookie)
      .expect(200);
    expect(page2.body).toHaveLength(2);
  });

  it('rejects limit above the maximum with 400', async () => {
    const cookie = await registerAndLogin(unique('page'));

    const res = await request(app)
      .get('/natter/message?limit=101')
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid query');
  });

  it('rejects non-numeric pagination params with 400', async () => {
    const cookie = await registerAndLogin(unique('page'));

    const res = await request(app)
      .get('/natter/message?limit=abc')
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid query');
  });

  it('rejects negative offset with 400', async () => {
    const cookie = await registerAndLogin(unique('page'));

    const res = await request(app)
      .get('/natter/space?offset=-1')
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
  });
});

afterAll(async () => {
  await dbAdmin`DELETE FROM messages WHERE author LIKE 'page_%'`;
  await dbAdmin`DELETE FROM spaces WHERE owner LIKE 'page_%'`;
  await dbUser`DELETE FROM users WHERE username LIKE 'page_%'`;
});