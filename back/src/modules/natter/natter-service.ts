import type { TokenPayload } from '../auth/jwt-service.js';
import type { NatterRepository } from './natter-repository.js';
import type { Message, MessageView, Space, SpaceView } from './natter-types.js';

import { HttpError } from '../../shared/error/http-error.js';

export type CurrentUser = () => TokenPayload;

export class NatterService {
  constructor(
    private readonly natterRepo: NatterRepository,
    private readonly getCurrentUser: CurrentUser,
  ) {}

  async createMessage(data: Message): Promise<MessageView> {
    return this.natterRepo.createMessage(data, this.getCurrentUser().username);
  }

  async createSpace(data: Space): Promise<SpaceView> {
    return this.natterRepo.createSpace(data, this.getCurrentUser().username);
  }

  async deleteMessage(id: number): Promise<void> {
    await this.natterRepo.deleteMessage(id, this.getCurrentUser().username);
  }

  async deleteSpace(id: number): Promise<void> {
    await this.natterRepo.deleteSpace(id, this.getCurrentUser().username);
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

  async findByIdMessage(id: number): Promise<MessageView> {
    const result = await this.natterRepo.findByIdMessage(id);
    if (!result) throw HttpError.notFound('Message not found');
    return result;
  }

  async findByIdSpace(id: number): Promise<SpaceView> {
    const result = await this.natterRepo.findByIdSpace(id);
    if (!result) throw HttpError.notFound('Space not found');
    return result;
  }

  async updateMessage(id: number, content: string): Promise<MessageView> {
    return this.natterRepo.updateMessage(id, content, this.getCurrentUser().username);
  }
}