import type { SecurityEventLogger } from '../audit_log/security-event-logger.js';
import type { TokenPayload } from '../auth/jwt-service.js';
import type { NatterRepository } from './natter-repository.js';
import type { Message, MessageView, Space, SpaceView } from './natter-types.js';
import type { ListQuery } from './natter-validation.js';

import { requestContext } from '../../shared/context/request-context.js';
import { HttpError } from '../../shared/error/http-error.js';

export type CurrentUser = () => TokenPayload;

export class NatterService {
  constructor(
    private readonly natterRepo: NatterRepository,
    private readonly getCurrentUser: CurrentUser,
    private readonly events: SecurityEventLogger,
  ) {}

  async createMessage(data: Message): Promise<MessageView> {
    const user = this.getCurrentUser();
    const message = await this.natterRepo.createMessage(data, user.username);
    await this.events.log({
      action: 'RESOURCE_CREATED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `message:${message.id}`,
    });
    return message;
  }

  async createSpace(data: Space): Promise<SpaceView> {
    const user = this.getCurrentUser();
    const space = await this.natterRepo.createSpace(data, user.username);
    await this.events.log({
      action: 'RESOURCE_CREATED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `space:${space.id}`,
    });
    return space;
  }

  async deleteMessage(id: number): Promise<void> {
    const user = this.getCurrentUser();
    await this.natterRepo.deleteMessage(id, user.username);
    await this.events.log({
      action: 'RESOURCE_DELETED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `message:${id}`,
    });
  }

  async deleteSpace(id: number): Promise<void> {
    const user = this.getCurrentUser();
    await this.natterRepo.deleteSpace(id, user.username);
    await this.events.log({
      action: 'RESOURCE_DELETED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `space:${id}`,
    });
  }

  async findAllMessages(listQuery: ListQuery): Promise<MessageView[]> {
    const result = await this.natterRepo.findAllMessages(
      this.getCurrentUser().username,
      listQuery.limit,
      listQuery.offset,
    );
    if (!result) throw HttpError.notFound('Messages not found');
    return result;
  }

  async findAllSpaces(listQuery: ListQuery): Promise<SpaceView[]> {
    const result = await this.natterRepo.findAllSpaces(
      this.getCurrentUser().username,
      listQuery.limit,
      listQuery.offset,
    );
    if (!result) throw HttpError.notFound('Spaces not found');
    return result;
  }

  async findByIdMessage(id: number): Promise<MessageView> {
    const result = await this.natterRepo.findByIdMessage(
      id,
      this.getCurrentUser().username,
    );
    if (!result) throw HttpError.notFound('Message not found');
    return result;
  }

  async findByIdSpace(id: number): Promise<SpaceView> {
    const result = await this.natterRepo.findByIdSpace(
      id,
      this.getCurrentUser().username,
    );
    if (!result) throw HttpError.notFound('Space not found');
    return result;
  }

  async updateMessage(id: number, content: string): Promise<MessageView> {
    const user = this.getCurrentUser();
    const message = await this.natterRepo.updateMessage(id, content, user.username);
    await this.events.log({
      action: 'RESOURCE_UPDATED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `message:${id}`,
    });
    return message;
  }
}