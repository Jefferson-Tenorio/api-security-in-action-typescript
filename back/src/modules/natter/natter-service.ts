import type { SecurityEventLogger } from '../audit_log/security-event-logger.js';
import type { TokenPayload } from '../auth/jwt-service.js';
import type { NatterRepository, SpaceMemberView } from './natter-repository.js';
import type { Message, MessageView, Space, SpaceView } from './natter-types.js';
import type { ListQuery } from './natter-validation.js';

import {
  authorize,
  type SpaceAction,
  type SpaceRole,
} from '../../shared/authz/authz.js';
import { requestContext } from '../../shared/context/request-context.js';
import { HttpError } from '../../shared/error/http-error.js';

export type CurrentUser = () => TokenPayload;

export class NatterService {
  constructor(
    private readonly natterRepo: NatterRepository,
    private readonly getCurrentUser: CurrentUser,
    private readonly events: SecurityEventLogger,
  ) {}

  async addMember(spaceId: number, username: string): Promise<SpaceMemberView> {
    const user = this.getCurrentUser();
    const role = await this.requireRole(spaceId, user, 'space:manage');

    const targetId = await this.natterRepo.findUserIdByUsername(username);
    if (!targetId) throw HttpError.notFound('User not found');

    if (role === 'owner' && targetId === user.userId) {
      throw HttpError.badRequest('Cannot add the owner as a member');
    }

    await this.natterRepo.addMember(spaceId, targetId, 'member');
    await this.events.log({
      action: 'RESOURCE_CREATED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `space:${spaceId}/member:${username}`,
    });
    return { role: 'member', userId: targetId, username };
  }

  async createMessage(data: Message): Promise<MessageView> {
    const user = this.getCurrentUser();
    await this.requireRole(Number(data.space_id), user, 'message:write');

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
    const space = await this.natterRepo.createSpace(data, user.userId);
    await this.events.log({
      action: 'RESOURCE_CREATED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `space:${space.id}`,
    });
    return { ...space, owner: user.username };
  }

  async deleteMessage(id: number): Promise<void> {
    const user = this.getCurrentUser();
    const message = await this.natterRepo.findByIdMessage(id, user.userId);
    if (!message) throw HttpError.notFound('Message not found');
    const role = await this.requireRole(message.space_id, user, 'message:delete');

    if (!authorize(user, messageContext(role, message.author), 'message:delete')) {
      throw HttpError.notFound('Message not found');
    }

    await this.natterRepo.deleteMessage(id);
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
    const role = await this.requireRole(id, user, 'space:manage');
    if (role !== 'owner') throw HttpError.notFound('Space not found');

    await this.natterRepo.deleteSpace(id);
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
      this.getCurrentUser().userId,
      listQuery.limit,
      listQuery.offset,
    );
    if (!result) throw HttpError.notFound('Messages not found');
    return result;
  }

  async findAllSpaces(listQuery: ListQuery): Promise<SpaceView[]> {
    const result = await this.natterRepo.findAllSpaces(
      this.getCurrentUser().userId,
      listQuery.limit,
      listQuery.offset,
    );
    if (!result) throw HttpError.notFound('Spaces not found');
    return result;
  }

  async findByIdMessage(id: number): Promise<MessageView> {
    const message = await this.natterRepo.findByIdMessage(
      id,
      this.getCurrentUser().userId,
    );
    if (!message) throw HttpError.notFound('Message not found');
    return message;
  }

  async findByIdSpace(id: number): Promise<SpaceView> {
    const space = await this.natterRepo.findByIdSpace(
      id,
      this.getCurrentUser().userId,
    );
    if (!space) throw HttpError.notFound('Space not found');
    return space;
  }

  async listMembers(spaceId: number): Promise<SpaceMemberView[]> {
    const user = this.getCurrentUser();
    await this.requireRole(spaceId, user, 'space:read');
    return this.natterRepo.listMembers(spaceId);
  }

  async removeMember(spaceId: number, username: string): Promise<void> {
    const user = this.getCurrentUser();
    await this.requireRole(spaceId, user, 'space:manage');

    const targetId = await this.natterRepo.findUserIdByUsername(username);
    if (!targetId) throw HttpError.notFound('Member not found');

    await this.natterRepo.removeMember(spaceId, targetId);
    await this.events.log({
      action: 'RESOURCE_DELETED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `space:${spaceId}/member:${username}`,
    });
  }

  async updateMessage(id: number, content: string): Promise<MessageView> {
    const user = this.getCurrentUser();
    const message = await this.natterRepo.findByIdMessage(id, user.userId);
    if (!message) throw HttpError.notFound('Message not found');
    const role = await this.requireRole(message.space_id, user, 'message:update');

    if (!authorize(user, messageContext(role, message.author), 'message:update')) {
      throw HttpError.notFound('Message not found');
    }

    const updated = await this.natterRepo.updateMessage(id, content);
    await this.events.log({
      action: 'RESOURCE_UPDATED',
      actor: user.userId,
      outcome: 'success',
      requestId: requestContext.getRequestId(),
      resource: `message:${id}`,
    });
    return updated;
  }

  private async requireRole(
    spaceId: number,
    user: TokenPayload,
    action: SpaceAction,
  ): Promise<SpaceRole> {
    const role = await this.natterRepo.findRole(spaceId, user.userId);
    if (!role || !authorize(user, spaceContext(role, spaceId), action)) {
      throw HttpError.notFound('Space not found');
    }
    return role;
  }
}

function messageContext(
  role: SpaceRole,
  author: string,
): Parameters<typeof authorize>[1] {
  return { actorRole: role, author, spaceOwner: '', type: 'message' };
}

function spaceContext(role: SpaceRole, spaceId: number): Parameters<typeof authorize>[1] {
  return { actorRole: role, spaceId, spaceOwner: '', type: 'space' };
}