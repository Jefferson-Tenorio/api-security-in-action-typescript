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

describe('BOLA/IDOR — read scope', () => {
  it('rejects unauthenticated reads with 401', async () => {
    const res = await request(app).get('/natter/message');
    expect(res.status).toBe(401);
  });

  it('user B cannot list messages created by user A', async () => {
    const owner = await registerAndLogin(unique('bola_owner'));
    const intruder = await registerAndLogin(unique('bola_intr'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', owner)
      .send({ name: 'Privado' })
      .expect(200);
    await request(app)
      .post('/natter/message')
      .set('Cookie', owner)
      .send({ content: 'segredo', space_id: String(space.body.id) })
      .expect(200);

    const res = await request(app).get('/natter/message').set('Cookie', intruder).expect(200);
    expect(res.body.some((m: { content: string }) => m.content === 'segredo')).toBe(false);
  });

  it('user B cannot read a message by id from user A (404)', async () => {
    const owner = await registerAndLogin(unique('bola_owner'));
    const intruder = await registerAndLogin(unique('bola_intr'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', owner)
      .send({ name: 'Privado2' })
      .expect(200);
    const message = await request(app)
      .post('/natter/message')
      .set('Cookie', owner)
      .send({ content: 'segredo2', space_id: String(space.body.id) })
      .expect(200);

    const res = await request(app).get(`/natter/message/${message.body.id}`).set('Cookie', intruder);
    expect(res.status).toBe(404);
  });

  it('user B cannot list or read spaces owned by user A (404)', async () => {
    const owner = await registerAndLogin(unique('bola_owner'));
    const intruder = await registerAndLogin(unique('bola_intr'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', owner)
      .send({ name: 'Sala Secreta' })
      .expect(200);

    const list = await request(app).get('/natter/space').set('Cookie', intruder).expect(200);
    expect(list.body.some((s: { id: number }) => s.id === space.body.id)).toBe(false);

    const detail = await request(app).get(`/natter/space/${space.body.id}`).set('Cookie', intruder);
    expect(detail.status).toBe(404);
  });

  it('owner can still read own resources', async () => {
    const owner = await registerAndLogin(unique('bola_owner'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', owner)
      .send({ name: 'Minha Sala' })
      .expect(200);
    const message = await request(app)
      .post('/natter/message')
      .set('Cookie', owner)
      .send({ content: 'meu segredo', space_id: String(space.body.id) })
      .expect(200);

    const spaces = await request(app).get('/natter/space').set('Cookie', owner).expect(200);
    expect(spaces.body.some((s: { id: number }) => s.id === space.body.id)).toBe(true);

    const msg = await request(app).get(`/natter/message/${message.body.id}`).set('Cookie', owner).expect(200);
    expect(msg.body.content).toBe('meu segredo');
  });
});

afterAll(async () => {
  await dbAdmin`DELETE FROM messages WHERE author LIKE 'bola_%'`;
  await dbAdmin`DELETE FROM spaces WHERE owner LIKE 'bola_%'`;
  await dbUser`DELETE FROM users WHERE username LIKE 'bola_%'`;
});
