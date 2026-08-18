import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { App } from './app.js';
import { dbAdmin, dbUser } from './shared/db/db.js';

const app = new App().instance;
const password = 'SenhaForte123!';

function extractCookie(res: request.Response): string {
  const header = res.headers['set-cookie'];
  const cookie = Array.isArray(header) ? header[0] : header;
  if (!cookie) throw new Error('No set-cookie header');
  return cookie.split(';')[0];
}

async function registerAndLogin(username: string): Promise<string> {
  await request(app)
    .post('/auth/register')
    .send({ password, username })
    .expect(201);
  const res = await request(app)
    .post('/auth/login')
    .send({ password, username })
    .expect(200);
  return extractCookie(res);
}

function unique(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

describe('Auth contract', () => {
  it('register creates a user and returns 201', async () => {
    const username = unique('test_a');
    const res = await request(app)
      .post('/auth/register')
      .send({ password, username });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'User created' });
  });

  it('register rejects duplicate username with 409', async () => {
    const username = unique('test_a');
    await request(app).post('/auth/register').send({ password, username }).expect(201);

    const res = await request(app).post('/auth/register').send({ password, username });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Username already exists');
  });

  it('login sets an httpOnly token cookie', async () => {
    const username = unique('test_a');
    await request(app).post('/auth/register').send({ password, username }).expect(201);

    const res = await request(app).post('/auth/login').send({ password, username });

    expect(res.status).toBe(200);
    const cookie = extractCookie(res);
    const header = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie'][0]
      : (res.headers['set-cookie'] as string);
    expect(cookie).toContain('token=');
    expect(header).toContain('HttpOnly');
  });

  it('login with wrong password returns 401', async () => {
    const username = unique('test_a');
    await request(app).post('/auth/register').send({ password, username }).expect(201);

    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'senha-errada', username });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid credentials');
  });
});

describe('Natter contract', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/natter/space');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Not authenticated');
  });

  it('derives author and owner from the session, ignoring client input', async () => {
    const username = unique('test_b');
    const cookie = await registerAndLogin(username);

    const spaceRes = await request(app)
      .post('/natter/space')
      .set('Cookie', cookie)
      .send({ name: 'Sala Teste', owner: 'evil' });

    expect(spaceRes.status).toBe(200);
    expect(spaceRes.body.owner).toBe(username);

    const msgRes = await request(app)
      .post('/natter/message')
      .set('Cookie', cookie)
      .send({ author: 'evil', content: 'Oi', space_id: String(spaceRes.body.id) });

    expect(msgRes.status).toBe(200);
    expect(msgRes.body.author).toBe(username);
    expect(msgRes.body.content).toBe('Oi');
    expect(msgRes.body).not.toHaveProperty('msg_text');
  });

  it('returns 404 for missing resources', async () => {
    const cookie = await registerAndLogin(unique('test_b'));

    const res = await request(app).get('/natter/message/999999').set('Cookie', cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Message not found');
  });

  it('list and detail return the same shape', async () => {
    const cookie = await registerAndLogin(unique('test_b'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', cookie)
      .send({ name: 'Shape Teste' });
    await request(app)
      .post('/natter/message')
      .set('Cookie', cookie)
      .send({ content: 'shape', space_id: String(space.body.id) })
      .expect(200);

    const list = await request(app).get('/natter/message').set('Cookie', cookie);
    const listed = list.body.find(
      (message: { space_id: number }) => message.space_id === space.body.id,
    );
    const detail = await request(app)
      .get(`/natter/message/${listed.id}`)
      .set('Cookie', cookie);

    expect(Object.keys(listed).sort()).toEqual(Object.keys(detail.body).sort());
    expect(detail.body.content).toBe('shape');
  });

  it('blocks updates and deletes of messages owned by another user with 404', async () => {
    const owner = await registerAndLogin(unique('test_b'));
    const intruder = await registerAndLogin(unique('test_b'));

    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', owner)
      .send({ name: 'Ownership' });
    const message = await request(app)
      .post('/natter/message')
      .set('Cookie', owner)
      .send({ content: 'privada', space_id: String(space.body.id) });

    const updateRes = await request(app)
      .put(`/natter/message/${message.body.id}`)
      .set('Cookie', intruder)
      .send({ content: 'hackeado' });
    expect(updateRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/natter/message/${message.body.id}`)
      .set('Cookie', intruder);
    expect(deleteRes.status).toBe(404);
  });
});

afterAll(async () => {
  await dbAdmin`DELETE FROM messages WHERE author LIKE 'test_%'`;
  await dbAdmin`
    DELETE FROM spaces WHERE id IN (
      SELECT sm.space_id FROM space_members sm JOIN users u ON u.id = sm.user_id
      WHERE u.username LIKE 'test_%'
    )
  `;
  await dbUser`DELETE FROM users WHERE username LIKE 'test_%'`;
});