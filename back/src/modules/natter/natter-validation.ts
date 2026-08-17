import type { Message, Space } from './natter-types.js';

export function isMessage(raw: unknown): raw is Message {
  if (typeof raw !== 'object' || raw === null) return false;

  const normalized = raw as Record<string, unknown>;

  return (
    typeof normalized.content === 'string' &&
    typeof normalized.space_id === 'string' &&
    typeof normalized.author === 'string'
  );
}

export function isSpace(raw: unknown): raw is Space {
  if (typeof raw !== 'object' || raw === null) return false;

  const normalized = raw as Record<string, unknown>;

  return (
    typeof normalized.name === 'string' && typeof normalized.owner === 'string'
  );
}
