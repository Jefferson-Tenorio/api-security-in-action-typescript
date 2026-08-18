import { describe, expect, it } from 'vitest';

import { authorize, hasSpacePermission, type Subject } from './authz.js';

const owner: Subject = { userId: 'u-owner', username: 'owner' };
const member: Subject = { userId: 'u-member', username: 'member' };

const spaceContext = {
  actorRole: 'owner' as const,
  spaceId: 1,
  spaceOwner: 'owner',
  type: 'space' as const,
};

function messageContext(
  actorRole: 'member' | 'owner',
  author = 'member',
): Parameters<typeof authorize>[1] {
  return {
    actorRole,
    author,
    spaceOwner: 'owner',
    type: 'message' as const,
  };
}

describe('hasSpacePermission (role → permission map)', () => {
  it('owner can manage space and write messages', () => {
    expect(hasSpacePermission('owner', 'space:manage')).toBe(true);
    expect(hasSpacePermission('owner', 'message:write')).toBe(true);
    expect(hasSpacePermission('owner', 'space:read')).toBe(true);
  });

  it('member can read and write messages but cannot manage the space', () => {
    expect(hasSpacePermission('member', 'space:read')).toBe(true);
    expect(hasSpacePermission('member', 'message:write')).toBe(true);
    expect(hasSpacePermission('member', 'space:manage')).toBe(false);
  });
});

describe('authorize — space actions', () => {
  it('owner can manage the space; member cannot', () => {
    expect(authorize(owner, { ...spaceContext, actorRole: 'owner' }, 'space:manage')).toBe(true);
    expect(
      authorize(member, { ...spaceContext, actorRole: 'member' }, 'space:manage'),
    ).toBe(false);
  });

  it('member can read the space', () => {
    expect(authorize(member, { ...spaceContext, actorRole: 'member' }, 'space:read')).toBe(true);
  });
});

describe('authorize — message actions (ABAC: author or owner)', () => {
  it('member can write a message in a space they belong to', () => {
    expect(
      authorize(member, messageContext('member'), 'message:write'),
    ).toBe(true);
  });

  it('member can update/delete only their own messages', () => {
    expect(
      authorize(member, messageContext('member', 'member'), 'message:update'),
    ).toBe(true);
    expect(
      authorize(member, messageContext('member', 'someone-else'), 'message:update'),
    ).toBe(false);
    expect(
      authorize(member, messageContext('member', 'someone-else'), 'message:delete'),
    ).toBe(false);
  });

  it('owner can update/delete any message in the space', () => {
    expect(
      authorize(owner, messageContext('owner', 'someone-else'), 'message:update'),
    ).toBe(true);
    expect(
      authorize(owner, messageContext('owner', 'someone-else'), 'message:delete'),
    ).toBe(true);
  });
});