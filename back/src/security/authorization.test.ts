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

describe('Authorization — cross-user ownership matrix', () => {
  it('user B is denied every operation on user A resources (404)', async () => {
    const cookieA = await registerAndLogin(unique('authz_a'));
    const cookieB = await registerAndLogin(unique('authz_b'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', cookieA)
      .send({ name: 'Sala da A' })
      .expect(200);
    const message = await request(app)
      .post('/natter/message')
      .set('Cookie', cookieA)
      .send({ content: 'segredo', space_id: String(space.body.id) })
      .expect(200);

    const spaceChecks = [
      request(app).get(`/natter/space/${space.body.id}`).set('Cookie', cookieB),
      request(app).delete(`/natter/space/${space.body.id}`).set('Cookie', cookieB),
    ];
    const messageChecks = [
      request(app).get(`/natter/message/${message.body.id}`).set('Cookie', cookieB),
      request(app)
        .put(`/natter/message/${message.body.id}`)
        .set('Cookie', cookieB)
        .send({ content: 'hackeado' }),
      request(app).delete(`/natter/message/${message.body.id}`).set('Cookie', cookieB),
    ];

    for (const check of [...spaceChecks, ...messageChecks]) {
      const res = await check;
      expect(res.status).toBe(404);
      expect(res.body.error.message).toBeTruthy();
    }

    const spaces = await request(app).get('/natter/space').set('Cookie', cookieB).expect(200);
    expect(spaces.body.some((s: { id: number }) => s.id === space.body.id)).toBe(false);

    const messages = await request(app)
      .get('/natter/message')
      .set('Cookie', cookieB)
      .expect(200);
    expect(messages.body.some((m: { id: number }) => m.id === message.body.id)).toBe(false);
  });

  it('owner A can still perform every operation on own resources', async () => {
    const cookieA = await registerAndLogin(unique('authz_a'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', cookieA)
      .send({ name: 'Minha sala' })
      .expect(200);
    const message = await request(app)
      .post('/natter/message')
      .set('Cookie', cookieA)
      .send({ content: 'meu segredo', space_id: String(space.body.id) })
      .expect(200);

    expect((await request(app).get(`/natter/space/${space.body.id}`).set('Cookie', cookieA)).status).toBe(200);
    expect((await request(app).get(`/natter/message/${message.body.id}`).set('Cookie', cookieA)).status).toBe(200);

    const updated = await request(app)
      .put(`/natter/message/${message.body.id}`)
      .set('Cookie', cookieA)
      .send({ content: 'atualizado' })
      .expect(200);
    expect(updated.body.content).toBe('atualizado');

    expect((await request(app).delete(`/natter/message/${message.body.id}`).set('Cookie', cookieA)).status).toBe(204);
    expect((await request(app).delete(`/natter/space/${space.body.id}`).set('Cookie', cookieA)).status).toBe(204);
  });

  it('does not distinguish owned from nonexistent resources (404, no enumeration)', async () => {
    const cookieA = await registerAndLogin(unique('authz_a'));
    const cookieB = await registerAndLogin(unique('authz_b'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', cookieA)
      .send({ name: 'Sala' })
      .expect(200);
    const owned = await request(app)
      .get(`/natter/space/${space.body.id}`)
      .set('Cookie', cookieB);
    const missing = await request(app).get('/natter/space/999999').set('Cookie', cookieB);

    expect(owned.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(owned.body.error.message).toBe(missing.body.error.message);
  });
});

afterAll(async () => {
  await dbAdmin`DELETE FROM messages WHERE author LIKE 'authz_%'`;
  await dbAdmin`DELETE FROM spaces WHERE id IN (SELECT sm.space_id FROM space_members sm JOIN users u ON u.id = sm.user_id WHERE u.username LIKE 'authz_%')`;
  await dbUser`DELETE FROM users WHERE username LIKE 'authz_%'`;
});