import type { Message, Space } from './natter-types.js';

import { HttpError } from '../../shared/error/http-error.js';

export function isContent(raw: unknown): raw is string {
  return typeof raw === 'string' && raw.length > 0;
}

export function isMessage(raw: unknown): raw is Message {
  if (typeof raw !== 'object' || raw === null) return false;

  const normalized = raw as Record<string, unknown>;

  return (
    typeof normalized.content === 'string' &&
    typeof normalized.space_id === 'string'
  );
}

export function isSpace(raw: unknown): raw is Space {
  if (typeof raw !== 'object' || raw === null) return false;

  const normalized = raw as Record<string, unknown>;

  return typeof normalized.name === 'string';
}

export function parseId(raw: unknown): number {
  const id = Number(raw);
  if (typeof raw !== 'string' || !Number.isInteger(id) || id <= 0) {
    throw HttpError.badRequest('Invalid id');
  }
  return id;
}