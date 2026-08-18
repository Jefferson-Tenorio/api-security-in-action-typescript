import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { App } from '../app.js';
import { dbAdmin, dbUser } from '../shared/db/db.js';

const app = new App().instance;
const password = 'SenhaForte123!';

async function createSpace(cookie: string, name: string): Promise<number> {
  const res = await request(app).post('/natter/space').set('Cookie', cookie).send({ name });
  return res.body.id as number;
}

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

describe('Authorization matrix — space membership', () => {
  it('owner can add and remove members and list them', async () => {
    const owner = await registerAndLogin(unique('m_owner'));
    const member = await registerAndLogin(unique('m_member'));
    const spaceId = await createSpace(owner, 'Matriz sala');
    const memberUsername = await usernameFromCookie(member);

    const added = await request(app)
      .post(`/natter/space/${spaceId}/member`)
      .set('Cookie', owner)
      .send({ username: memberUsername });
    expect(added.status).toBe(200);
    expect(added.body).toMatchObject({ role: 'member', username: memberUsername });

    const listed = await request(app)
      .get(`/natter/space/${spaceId}/member`)
      .set('Cookie', owner);
    expect(listed.status).toBe(200);
    expect(
      listed.body.some(
        (m: { role: string; username: string }) =>
          m.username === memberUsername && m.role === 'member',
      ),
    ).toBe(true);

    const removed = await request(app)
      .delete(`/natter/space/${spaceId}/member/${memberUsername}`)
      .set('Cookie', owner);
    expect(removed.status).toBe(204);

    const after = await request(app)
      .get(`/natter/space/${spaceId}/member`)
      .set('Cookie', owner);
    expect(
      after.body.some((m: { username: string }) => m.username === memberUsername),
    ).toBe(false);
  });
});

describe('Authorization matrix — message actions', () => {
  it('member can read/write messages; cannot manage the space', async () => {
    const owner = await registerAndLogin(unique('m_owner'));
    const member = await registerAndLogin(unique('m_member'));
    const spaceId = await createSpace(owner, 'Matriz msgs');
    const ownerUsername = await usernameFromCookie(owner);

    await addMember(owner, spaceId, ownerUsername, member);

    const written = await request(app)
      .post('/natter/message')
      .set('Cookie', member)
      .send({ content: 'oi membro', space_id: String(spaceId) });
    expect(written.status).toBe(200);
    expect(written.body.author).toBe(await usernameFromCookie(member));

    const listed = await request(app).get('/natter/message').set('Cookie', member);
    expect(listed.status).toBe(200);
    expect(listed.body.some((m: { id: number }) => m.id === written.body.id)).toBe(true);

    const denied = await request(app)
      .post(`/natter/space/${spaceId}/member`)
      .set('Cookie', member)
      .send({ username: ownerUsername });
    expect(denied.status).toBe(404);
  });

  it('member cannot update/delete messages of another member', async () => {
    const owner = await registerAndLogin(unique('m_owner'));
    const memberA = await registerAndLogin(unique('m_member'));
    const memberB = await registerAndLogin(unique('m_member'));
    const spaceId = await createSpace(owner, 'Matriz abac');

    await addMember(owner, spaceId, await usernameFromCookie(owner), memberA);
    await addMember(owner, spaceId, await usernameFromCookie(owner), memberB);

    const message = await request(app)
      .post('/natter/message')
      .set('Cookie', memberA)
      .send({ content: 'do A', space_id: String(spaceId) })
      .expect(200);

    const update = await request(app)
      .put(`/natter/message/${message.body.id}`)
      .set('Cookie', memberB)
      .send({ content: 'roubado' });
    expect(update.status).toBe(404);

    const del = await request(app)
      .delete(`/natter/message/${message.body.id}`)
      .set('Cookie', memberB);
    expect(del.status).toBe(404);
  });

  it('owner can update/delete any message in the space', async () => {
    const owner = await registerAndLogin(unique('m_owner'));
    const member = await registerAndLogin(unique('m_member'));
    const spaceId = await createSpace(owner, 'Matriz owner');

    await addMember(owner, spaceId, await usernameFromCookie(owner), member);

    const message = await request(app)
      .post('/natter/message')
      .set('Cookie', member)
      .send({ content: 'do membro', space_id: String(spaceId) })
      .expect(200);

    const update = await request(app)
      .put(`/natter/message/${message.body.id}`)
      .set('Cookie', owner)
      .send({ content: 'editado pelo owner' });
    expect(update.status).toBe(200);

    const del = await request(app)
      .delete(`/natter/message/${message.body.id}`)
      .set('Cookie', owner);
    expect(del.status).toBe(204);
  });
});

describe('Authorization matrix — membership lifecycle', () => {
  it('non-member gets 404 for every resource action', async () => {
    const owner = await registerAndLogin(unique('m_owner'));
    const stranger = await registerAndLogin(unique('m_stranger'));
    const spaceId = await createSpace(owner, 'Matriz secreta');

    const readSpace = await request(app).get(`/natter/space/${spaceId}`).set('Cookie', stranger);
    expect(readSpace.status).toBe(404);

    const writeMessage = await request(app)
      .post('/natter/message')
      .set('Cookie', stranger)
      .send({ content: 'intruso', space_id: String(spaceId) });
    expect(writeMessage.status).toBe(404);

    const manage = await request(app)
      .post(`/natter/space/${spaceId}/member`)
      .set('Cookie', stranger)
      .send({ username: 'qualquer' });
    expect(manage.status).toBe(404);

    const deleteSpace = await request(app).delete(`/natter/space/${spaceId}`).set('Cookie', stranger);
    expect(deleteSpace.status).toBe(404);
  });

  it('removed member loses access (404) and owner can re-add', async () => {
    const owner = await registerAndLogin(unique('m_owner'));
    const member = await registerAndLogin(unique('m_member'));
    const spaceId = await createSpace(owner, 'Matriz ciclo');
    const ownerUsername = await usernameFromCookie(owner);
    const memberUsername = await usernameFromCookie(member);

    await addMember(owner, spaceId, ownerUsername, member);
    expect(
      (await request(app).get(`/natter/space/${spaceId}`).set('Cookie', member)).status,
    ).toBe(200);

    const removed = await request(app)
      .delete(`/natter/space/${spaceId}/member/${memberUsername}`)
      .set('Cookie', owner);
    expect(removed.status).toBe(204);

    expect(
      (await request(app).get(`/natter/space/${spaceId}`).set('Cookie', member)).status,
    ).toBe(404);

    const reAdded = await request(app)
      .post(`/natter/space/${spaceId}/member`)
      .set('Cookie', owner)
      .send({ username: memberUsername });
    expect(reAdded.status).toBe(200);
    expect(
      (await request(app).get(`/natter/space/${spaceId}`).set('Cookie', member)).status,
    ).toBe(200);
  });

  it('member cannot remove the owner or themselves manage the owner', async () => {
    const owner = await registerAndLogin(unique('m_owner'));
    const member = await registerAndLogin(unique('m_member'));
    const spaceId = await createSpace(owner, 'Matriz protecao');
    const ownerUsername = await usernameFromCookie(owner);

    await addMember(owner, spaceId, ownerUsername, member);

    const removeOwner = await request(app)
      .delete(`/natter/space/${spaceId}/member/${ownerUsername}`)
      .set('Cookie', member);
    expect(removeOwner.status).toBe(404);

    const ownerStillThere = await request(app)
      .get(`/natter/space/${spaceId}/member`)
      .set('Cookie', owner);
    expect(ownerStillThere.status).toBe(200);
    expect(
      ownerStillThere.body.some(
        (m: { role: string; username: string }) => m.username === ownerUsername && m.role === 'owner',
      ),
    ).toBe(true);
  });
});

async function addMember(
  ownerCookie: string,
  spaceId: number,
  _ownerUsername: string,
  memberCookie: string,
): Promise<void> {
  const res = await request(app)
    .post(`/natter/space/${spaceId}/member`)
    .set('Cookie', ownerCookie)
    .send({ username: await usernameFromCookie(memberCookie) });
  expect(res.status).toBe(200);
}

async function usernameFromCookie(cookie: string): Promise<string> {
  const token = cookie.replace('token=', '').split(';')[0];
  if (!token) throw new Error('Malformed token');
  const [, payload] = token.split('.');
  if (!payload) throw new Error('Malformed token');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return decoded.username as string;
}

afterAll(async () => {
  await dbAdmin`DELETE FROM messages WHERE author LIKE 'm_%'`;
  await dbAdmin`
    DELETE FROM spaces WHERE id IN (
      SELECT sm.space_id FROM space_members sm JOIN users u ON u.id = sm.user_id
      WHERE u.username LIKE 'm_%'
    )
  `;
  await dbUser`DELETE FROM users WHERE username LIKE 'm_%'`;
});