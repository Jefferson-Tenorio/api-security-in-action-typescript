import postgres from 'postgres';

import type { Message, Space } from './natter-types.js';

import { HttpError } from '../../shared/error/http-error.js';

export class NatterRepository {
  constructor(private readonly conn: postgres.Sql) {}

  // users
  async createMessage(data: Message, author: string): Promise<Message> {
    const [message] = await this.conn<Message[]>`
      INSERT INTO messages (msg_text, space_id, author)
      VALUES (${data.content}, ${data.space_id}, ${author})
      RETURNING *
    `;
    return message as Message;
  }

  // users
  async createSpace(data: Space, owner: string): Promise<Space> {
    const [space] = await this.conn<Space[]>`
      INSERT INTO spaces (name, owner)
      VALUES (${data.name}, ${owner})
      RETURNING *
    `;
    return space as Space;
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
  async findAllMessages(): Promise<Message[] | null> {
    return this.conn<Message[]>`
      SELECT m.id, m.msg_time, m.msg_text FROM messages m JOIN spaces s ON m.space_id = s.id
    `;
  }

  // users
  async findAllSpaces(): Promise<null | Space[]> {
    return this.conn<Space[]>`
      SELECT * FROM spaces;
    `;
  }

  // users
  async findByIdMessage(id: string): Promise<Message | null> {
    const [message] = await this.conn<Message[]>`
      SELECT * FROM messages WHERE id = ${id}
    `;
    return message ?? null;
  }

  // users
  async findByIdSpace(id: string): Promise<null | Space> {
    const [space] = await this.conn<Space[]>`
      SELECT * FROM spaces WHERE id = ${id}
    `;
    return space ?? null;
  }

  // admin
  async updateMessage(id: string, content: string, author: string): Promise<Message> {
    const [message] = await this.conn<Message[]>`
      UPDATE messages
      SET msg_text = ${content}
      WHERE id = ${id} AND author = ${author}
      RETURNING *
    `;
    if (!message) throw HttpError.notFound('Message not found');
    return message;
  }
}