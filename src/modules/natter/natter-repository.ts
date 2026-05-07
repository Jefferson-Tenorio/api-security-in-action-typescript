import postgres from 'postgres'
import type { Message, Space} from './natter-service.js'
import { HttpError} from './../../shared/error/http-error.js'

export class NatterRepository {

  constructor(private readonly conn: postgres.Sql) {} 

  //users
  async createSpace(data: Space): Promise<Space> {
    const [space] = await this.conn<Space[]>`
      INSERT INTO spaces (name, owner)
      VALUES (${data.name}, ${data.owner})
      RETURNING *
    `;
    return space as Space;
  }

  //users
  async createMessage(data: Message): Promise<Message>{
    const [message] = await this.conn<Message[]>`
        INSERT INTO messages (msg_text, space_id, author)
        VALUES (${data.content},(${data.space_id}),(${data.author}))
        RETURNING *
    `;
    return message as Message
  }

  //users
  async findByIdSpace(id: string): Promise<Space | null> {
    const [space] = await this.conn<Space[]>`
      SELECT * FROM spaces WHERE id = ${id}
    `;
    return space ?? null;
  }

  //users    
  async findByIdMessage(id: string): Promise<Message | null> {
    const [message] = await this.conn<Message[]>`
      SELECT * FROM messages WHERE id = ${id}
    `;
    return message ?? null;
  }

  //users
  async findAllMessages(): Promise<Message[] | null> {
    const message = await this.conn<Message[]>`
      SELECT m.id,m.msg_time,m.msg_text FROM messages m JOIN spaces s ON m.space_id = s.id 
    `;
    return message ?? null;
  }

  //users
  async findAllSpaces(): Promise<Space[] | null> {
    const spaces = await this.conn<Space[]>`
      SELECT * FROM spaces;
    `;
    return spaces ?? null;
  }

  //admin
  async deleteSpace(id: string): Promise<void> {
    const [space] = await this.conn<Space[]>`
      DELETE FROM spaces WHERE id = ${id}
    `;
  }

  //admin
  async deleteMessage(id: string): Promise<void> {
    const [message] = await this.conn<Message[]>`
      DELETE FROM messages WHERE id = ${id}
    `;
  }

  //admin
  async updateMessage(id: string,content:string): Promise<Message>{
    try {
      const [message] = await this.conn<Message[]>`
        UPDATE messages
        SET msg_text = ${content}
        WHERE id = ${id}
        RETURNING *
      `
      if(!message) throw HttpError.notFound("Message not found")
      return message
    } catch (error) {
      console.log(error)
      throw HttpError.notImplemented("Not implemented")
    }
  }

}