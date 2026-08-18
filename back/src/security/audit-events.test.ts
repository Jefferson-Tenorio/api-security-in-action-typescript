import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { App } from '../app.js';
import { dbUser } from '../shared/db/db.js';

const app = new App().instance;
const password = 'SenhaForte123!';

interface SecurityEventRow {
  action: string;
  actor: string;
  outcome: string;
  resource: null | string;
}

function extractCookie(res: request.Response): string {
  const header = res.headers['set-cookie'];
  const cookie = Array.isArray(header) ? header[0] : header;
  if (!cookie) throw new Error('No set-cookie header');
  return cookie.split(';')[0];
}

async function lastEventByActor(action: string, actor: string): Promise<SecurityEventRow | undefined> {
  const rows = await dbUser<SecurityEventRow[]>`
    SELECT action, actor, outcome, resource
    FROM security_events
    WHERE action = ${action} AND actor = ${actor}
    ORDER BY id DESC
    LIMIT 1
  `;
  return rows[0];
}

async function lastEventByResource(action: string, resource: string): Promise<SecurityEventRow | undefined> {
  const rows = await dbUser<SecurityEventRow[]>`
    SELECT action, actor, outcome, resource
    FROM security_events
    WHERE action = ${action} AND resource = ${resource}
    ORDER BY id DESC
    LIMIT 1
  `;
  return rows[0];
}

async function registerAndLogin(username: string): Promise<string> {
  await request(app).post('/auth/register').send({ password, username }).expect(201);
  const res = await request(app).post('/auth/login').send({ password, username }).expect(200);
  return extractCookie(res);
}

function unique(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

async function userIdOf(username: string): Promise<string> {
  const users = await dbUser<{ id: string }[]>`
    SELECT id FROM users WHERE username = ${username}
  `;
  const user = users[0];
  if (!user) throw new Error('User not found');
  return user.id;
}

describe('Semantic audit events', () => {
  it('records AUTH_LOGIN_SUCCESS with the user id as actor', async () => {
    const username = unique('ev');
    await request(app).post('/auth/register').send({ password, username }).expect(201);
    const userId = await userIdOf(username);

    await request(app).post('/auth/login').send({ password, username }).expect(200);

    const event = await lastEventByActor('AUTH_LOGIN_SUCCESS', userId);
    expect(event).toBeTruthy();
    expect(event?.actor).toBe(userId);
    expect(event?.outcome).toBe('success');
  });

  it('records AUTH_LOGIN_FAILURE with the attempted username', async () => {
    const username = unique('ev');

    await request(app)
      .post('/auth/login')
      .send({ password: 'senha-errada', username })
      .expect(401);

    const event = await lastEventByActor('AUTH_LOGIN_FAILURE', username);
    expect(event).toBeTruthy();
    expect(event?.actor).toBe(username);
    expect(event?.outcome).toBe('failure');
  });

  it('records AUTH_LOGOUT with the user id as actor', async () => {
    const username = unique('ev');
    const cookie = await registerAndLogin(username);
    const userId = await userIdOf(username);

    await request(app).post('/auth/logout').set('Cookie', cookie).expect(200);

    const event = await lastEventByActor('AUTH_LOGOUT', userId);
    expect(event).toBeTruthy();
    expect(event?.actor).toBe(userId);
    expect(event?.outcome).toBe('success');
  });

  it('records RESOURCE_CREATED/UPDATED/DELETED for messages', async () => {
    const cookie = await registerAndLogin(unique('ev'));
    const space = await request(app)
      .post('/natter/space')
      .set('Cookie', cookie)
      .send({ name: 'Sala ev' })
      .expect(200);
    const message = await request(app)
      .post('/natter/message')
      .set('Cookie', cookie)
      .send({ content: 'primeira', space_id: String(space.body.id) })
      .expect(200);

    await request(app)
      .put(`/natter/message/${message.body.id}`)
      .set('Cookie', cookie)
      .send({ content: 'segunda' })
      .expect(200);
    await request(app)
      .delete(`/natter/message/${message.body.id}`)
      .set('Cookie', cookie)
      .expect(204);

    const resource = `message:${message.body.id}`;
    const created = await lastEventByResource('RESOURCE_CREATED', resource);
    expect(created).toBeTruthy();
    expect(created?.outcome).toBe('success');

    const updated = await lastEventByResource('RESOURCE_UPDATED', resource);
    expect(updated).toBeTruthy();

    const deleted = await lastEventByResource('RESOURCE_DELETED', resource);
    expect(deleted).toBeTruthy();
  });

  it('records AUTHZ_DENIED for unauthenticated and invalid-token requests', async () => {
    await request(app).get('/natter/space').expect(401);
    await request(app)
      .get('/natter/space')
      .set('Cookie', 'token=garbage')
      .expect(401);

    const rows = await dbUser<SecurityEventRow[]>`
      SELECT action, actor, outcome, resource
      FROM security_events
      WHERE action = 'AUTHZ_DENIED' AND resource = '/natter/space' AND actor = 'anonymous'
      ORDER BY id DESC
      LIMIT 2
    `;
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) {
      expect(row.outcome).toBe('failure');
    }
  });

  it('supports retention cleanup by age', async () => {
    await dbUser`
      INSERT INTO security_events (actor, action, outcome, resource)
      VALUES ('ev_retention', 'AUTH_LOGIN_FAILURE', 'failure', NULL)
    `;

    await dbUser`
      DELETE FROM security_events WHERE created_at < now() - interval '0 days'
    `;

    const rows = await dbUser`
      SELECT 1 FROM security_events WHERE actor = 'ev_retention'
    `;
    expect(rows).toHaveLength(0);
  });
});

afterAll(async () => {
  await dbUser`DELETE FROM users WHERE username LIKE 'ev_%'`;
});