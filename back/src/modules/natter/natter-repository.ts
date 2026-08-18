import postgres from 'postgres';

import type { Message, MessageView, Space, SpaceView } from './natter-types.js';

import { HttpError } from '../../shared/error/http-error.js';

export class NatterRepository {
  constructor(private readonly conn: postgres.Sql) {}

  async createMessage(data: Message, author: string): Promise<MessageView> {
    const [message] = await this.conn<MessageView[]>`
      INSERT INTO messages (msg_text, space_id, author)
      VALUES (${data.content}, ${data.space_id}, ${author})
      RETURNING id, author, msg_text AS content, msg_time, space_id
    `;
    return message as MessageView;
  }

  async createSpace(data: Space, owner: string): Promise<SpaceView> {
    const [space] = await this.conn<SpaceView[]>`
      INSERT INTO spaces (name, owner)
      VALUES (${data.name}, ${owner})
      RETURNING id, name, owner
    `;
    return space as SpaceView;
  }

  async deleteMessage(id: number, author: string): Promise<void> {
    const result = await this.conn`
      DELETE FROM messages WHERE id = ${id} AND author = ${author}
    `;
    if (result.count === 0) throw HttpError.notFound('Message not found');
  }

  async deleteSpace(id: number, owner: string): Promise<void> {
    const result = await this.conn`
      DELETE FROM spaces WHERE id = ${id} AND owner = ${owner}
    `;
    if (result.count === 0) throw HttpError.notFound('Space not found');
  }

  async findAllMessages(
    author: string,
    limit: number,
    offset: number,
  ): Promise<MessageView[] | null> {
    return this.conn<MessageView[]>`
      SELECT m.id, m.author, m.msg_text AS content, m.msg_time, m.space_id
      FROM messages m JOIN spaces s ON m.space_id = s.id
      WHERE m.author = ${author}
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async findAllSpaces(
    owner: string,
    limit: number,
    offset: number,
  ): Promise<null | SpaceView[]> {
    return this.conn<SpaceView[]>`
      SELECT id, name, owner FROM spaces
      WHERE owner = ${owner}
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  async findByIdMessage(id: number, author: string): Promise<MessageView | null> {
    const [message] = await this.conn<MessageView[]>`
      SELECT id, author, msg_text AS content, msg_time, space_id
      FROM messages WHERE id = ${id} AND author = ${author}
    `;
    return message ?? null;
  }

  async findByIdSpace(id: number, owner: string): Promise<null | SpaceView> {
    const [space] = await this.conn<SpaceView[]>`
      SELECT id, name, owner FROM spaces WHERE id = ${id} AND owner = ${owner}
    `;
    return space ?? null;
  }

  async updateMessage(id: number, content: string, author: string): Promise<MessageView> {
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