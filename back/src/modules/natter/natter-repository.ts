import postgres from 'postgres';

import type { SpaceRole } from '../../shared/authz/authz.js';
import type { Message, MessageView, Space, SpaceView } from './natter-types.js';

import { HttpError } from '../../shared/error/http-error.js';

export interface SpaceMemberView {
  role: SpaceRole;
  userId: string;
  username: string;
}

export class NatterRepository {
  constructor(private readonly conn: postgres.Sql) {}

  async addMember(spaceId: number, userId: string, role: SpaceRole): Promise<void> {
    const result = await this.conn`
      INSERT INTO space_members (space_id, user_id, role)
      VALUES (${spaceId}, ${userId}, ${role})
      ON CONFLICT (space_id, user_id) DO NOTHING
    `;
    if (result.count === 0) throw HttpError.conflict('User is already a member');
  }

  async createMessage(data: Message, author: string): Promise<MessageView> {
    const [message] = await this.conn<MessageView[]>`
      INSERT INTO messages (msg_text, space_id, author)
      VALUES (${data.content}, ${data.space_id}, ${author})
      RETURNING id, author, msg_text AS content, msg_time, space_id
    `;
    return message as MessageView;
  }

  async createSpace(data: Space, ownerId: string): Promise<SpaceView> {
    return this.conn.begin(async (tx) => {
      const [space] = await tx<SpaceView[]>`
        INSERT INTO spaces (name)
        VALUES (${data.name})
        RETURNING id, name
      `;
      if (!space) throw new Error('Failed to create space');
      await tx`
        INSERT INTO space_members (space_id, user_id, role)
        VALUES (${space.id}, ${ownerId}, 'owner')
      `;
      return space as SpaceView;
    });
  }

  async deleteMessage(id: number): Promise<void> {
    const result = await this.conn`
      DELETE FROM messages WHERE id = ${id}
    `;
    if (result.count === 0) throw HttpError.notFound('Message not found');
  }

  async deleteSpace(id: number): Promise<void> {
    const result = await this.conn`
      DELETE FROM spaces WHERE id = ${id}
    `;
    if (result.count === 0) throw HttpError.notFound('Space not found');
  }

  async findAllMessages(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<MessageView[] | null> {
    return this.conn<MessageView[]>`
      SELECT DISTINCT m.id, m.author, m.msg_text AS content, m.msg_time, m.space_id
      FROM messages m
      JOIN space_members sm ON sm.space_id = m.space_id
      WHERE sm.user_id = ${userId}
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async findAllSpaces(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<null | SpaceView[]> {
    return this.conn<SpaceView[]>`
      SELECT s.id, s.name, o.username AS owner
      FROM spaces s
      JOIN space_members sm ON sm.space_id = s.id
      JOIN space_members so ON so.space_id = s.id AND so.role = 'owner'
      JOIN users o ON o.id = so.user_id
      WHERE sm.user_id = ${userId}
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async findByIdMessage(id: number, userId: string): Promise<MessageView | null> {
    const [message] = await this.conn<MessageView[]>`
      SELECT DISTINCT m.id, m.author, m.msg_text AS content, m.msg_time, m.space_id
      FROM messages m
      JOIN space_members sm ON sm.space_id = m.space_id
      WHERE m.id = ${id} AND sm.user_id = ${userId}
    `;
    return message ?? null;
  }

  async findByIdSpace(id: number, userId: string): Promise<null | SpaceView> {
    const [space] = await this.conn<SpaceView[]>`
      SELECT s.id, s.name, o.username AS owner
      FROM spaces s
      JOIN space_members sm ON sm.space_id = s.id
      JOIN space_members so ON so.space_id = s.id AND so.role = 'owner'
      JOIN users o ON o.id = so.user_id
      WHERE s.id = ${id} AND sm.user_id = ${userId}
    `;
    return space ?? null;
  }

  async findRole(spaceId: number, userId: string): Promise<null | SpaceRole> {
    const [row] = await this.conn<{ role: SpaceRole }[]>`
      SELECT role FROM space_members WHERE space_id = ${spaceId} AND user_id = ${userId}
    `;
    return row?.role ?? null;
  }

  async findUserIdByUsername(username: string): Promise<null | string> {
    const [row] = await this.conn<{ id: string }[]>`
      SELECT id FROM users WHERE username = ${username}
    `;
    return row?.id ?? null;
  }

  async listMembers(spaceId: number): Promise<SpaceMemberView[]> {
    return this.conn<SpaceMemberView[]>`
      SELECT sm.user_id AS "userId", u.username, sm.role
      FROM space_members sm
      JOIN users u ON u.id = sm.user_id
      WHERE sm.space_id = ${spaceId}
      ORDER BY sm.role = 'owner' DESC, u.username
    `;
  }

  async removeMember(spaceId: number, userId: string): Promise<void> {
    const result = await this.conn`
      DELETE FROM space_members
      WHERE space_id = ${spaceId} AND user_id = ${userId} AND role <> 'owner'
    `;
    if (result.count === 0) throw HttpError.notFound('Member not found');
  }

  async updateMessage(id: number, content: string): Promise<MessageView> {
    const [message] = await this.conn<MessageView[]>`
      UPDATE messages
      SET msg_text = ${content}
      WHERE id = ${id}
      RETURNING id, author, msg_text AS content, msg_time, space_id
    `;
    if (!message) throw HttpError.notFound('Message not found');
    return message;
  }
}