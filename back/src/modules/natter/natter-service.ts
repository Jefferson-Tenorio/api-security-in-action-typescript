import type { Message, MessageView, Space, SpaceView } from './natter-types.js';

import { requestContext } from '../../shared/context/request-context.js';
import { HttpError } from '../../shared/error/http-error.js';
import { NatterRepository } from './natter-repository.js';

export class NatterService {
  constructor(private readonly natterRepo: NatterRepository) {}

  async createMessage(data: Message): Promise<MessageView> {
    return this.natterRepo.createMessage(data, this.getUsername());
  }

  async createSpace(data: Space): Promise<SpaceView> {
    return this.natterRepo.createSpace(data, this.getUsername());
  }

  async deleteMessage(id: string): Promise<void> {
    await this.natterRepo.deleteMessage(id, this.getUsername());
  }

  async deleteSpace(id: string): Promise<void> {
    await this.natterRepo.deleteSpace(id, this.getUsername());
  }

  async findAllMessages(): Promise<MessageView[]> {
    const result = await this.natterRepo.findAllMessages();
    if (!result) throw HttpError.notFound('Messages not found');
    return result;
  }

  async findAllSpaces(): Promise<SpaceView[]> {
    const result = await this.natterRepo.findAllSpaces();
    if (!result) throw HttpError.notFound('Spaces not found');
    return result;
  }

  async findByIdMessage(id: string): Promise<MessageView> {
    if (!id) throw HttpError.badRequest('Id cannot be empty');
    const result = await this.natterRepo.findByIdMessage(id);
    if (!result) throw HttpError.notFound('Message not found');
    return result;
  }

  async findByIdSpace(id: string): Promise<SpaceView> {
    if (!id) throw HttpError.badRequest('Id cannot be empty');
    const result = await this.natterRepo.findByIdSpace(id);
    if (!result) throw HttpError.notFound('Space not found');
    return result;
  }

  async updateMessage(id: string, content: string): Promise<MessageView> {
    if (!content) throw HttpError.badRequest('Content cannot be empty');
    return this.natterRepo.updateMessage(id, content, this.getUsername());
  }

  private getUsername(): string {
    const user = requestContext.getStore()?.user;
    if (!user) throw HttpError.unauthorized('Not authenticated');
    return user.username;
  }
}