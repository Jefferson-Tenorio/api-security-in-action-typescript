import postgres from 'postgres';

import type { Message, MessageView, Space, SpaceView } from './natter-types.js';

import { HttpError } from '../../shared/error/http-error.js';

export class NatterRepository {
  constructor(private readonly conn: postgres.Sql) {}

  // users
  async createMessage(data: Message, author: string): Promise<MessageView> {
    const [message] = await this.conn<MessageView[]>`
      INSERT INTO messages (msg_text, space_id, author)
      VALUES (${data.content}, ${data.space_id}, ${author})
      RETURNING id, author, msg_text AS content, msg_time, space_id
    `;
    return message as MessageView;
  }

  // users
  async createSpace(data: Space, owner: string): Promise<SpaceView> {
    const [space] = await this.conn<SpaceView[]>`
      INSERT INTO spaces (name, owner)
      VALUES (${data.name}, ${owner})
      RETURNING id, name, owner
    `;
    return space as SpaceView;
  }

  // admin
  async deleteMessage(id: string, author: string): Promise<void> {
    await this.conn`
      DELETE FROM messages WHERE id = ${id} AND author = ${author}
    `;
  }

  // admin
  async deleteSpace(id: string, owner: string): Promise<void> {
    await this.conn`
      DELETE FROM spaces WHERE id = ${id} AND owner = ${owner}
    `;
  }

  // users
  async findAllMessages(): Promise<MessageView[] | null> {
    return this.conn<MessageView[]>`
      SELECT m.id, m.author, m.msg_text AS content, m.msg_time, m.space_id
      FROM messages m JOIN spaces s ON m.space_id = s.id
    `;
  }

  // users
  async findAllSpaces(): Promise<null | SpaceView[]> {
    return this.conn<SpaceView[]>`
      SELECT id, name, owner FROM spaces;
    `;
  }

  // users
  async findByIdMessage(id: string): Promise<MessageView | null> {
    const [message] = await this.conn<MessageView[]>`
      SELECT id, author, msg_text AS content, msg_time, space_id
      FROM messages WHERE id = ${id}
    `;
    return message ?? null;
  }

  // users
  async findByIdSpace(id: string): Promise<null | SpaceView> {
    const [space] = await this.conn<SpaceView[]>`
      SELECT id, name, owner FROM spaces WHERE id = ${id}
    `;
    return space ?? null;
  }

  // admin
  async updateMessage(id: string, content: string, author: string): Promise<MessageView> {
    const [message] = await this.conn<MessageView[]>`
      UPDATE messages
      SET msg_text = ${content}
      WHERE id = ${id} AND author = ${author}
      RETURNING id, author, msg_text AS content, msg_time, space_id
    `;
    if (!message) throw HttpError.notFound('Message not found');
    return message;
  }
}