export interface MessageContext {
  actorRole: SpaceRole;
  author: string;
  spaceOwner: string;
  type: 'message';
}

export type ResourceContext = MessageContext | SpaceContext;

export type SpaceAction =
  | 'message:delete'
  | 'message:update'
  | 'message:write'
  | 'space:manage'
  | 'space:read';

export interface SpaceContext {
  actorRole: SpaceRole;
  spaceId: number;
  spaceOwner: string;
  type: 'space';
}

export type SpaceRole = 'member' | 'owner';

export interface Subject {
  userId: string;
  username: string;
}

const rolePermissions: Record<SpaceRole, ReadonlySet<SpaceAction>> = {
  member: new Set([
    'message:delete',
    'message:update',
    'message:write',
    'space:read',
  ]),
  owner: new Set([
    'message:delete',
    'message:update',
    'message:write',
    'space:manage',
    'space:read',
  ]),
};

export function authorize(
  subject: Subject,
  resource: ResourceContext,
  action: SpaceAction,
): boolean {
  if (!hasSpacePermission(resource.actorRole, action)) return false;

  if (resource.type === 'message' && action !== 'message:write') {
    const isAuthor = resource.author === subject.username;
    const isOwner = resource.actorRole === 'owner';
    return isAuthor || isOwner;
  }

  return true;
}

export function hasSpacePermission(
  role: SpaceRole,
  action: SpaceAction,
): boolean {
  return rolePermissions[role].has(action);
}