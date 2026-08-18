import { z, type ZodIssue } from 'zod';

import { HttpError } from '../../shared/error/http-error.js';

const messageSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(100),
  space_id: z.string().min(1, 'space_id cannot be empty'),
});

const spaceSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(50),
});

const contentSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(100),
});

const idSchema = z.coerce.number().int().positive();

const usernameSchema = z.object({
  username: z.string().min(1, 'Username cannot be empty').max(50),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseContent(body: unknown): z.infer<typeof contentSchema> {
  const result = contentSchema.safeParse(body);
  if (!result.success) return reject('Invalid payload', result.error.issues);
  return result.data;
}

export function parseId(raw: unknown): number {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw HttpError.badRequest('Invalid id');
  return result.data;
}

export function parseListQuery(query: unknown): ListQuery {
  const result = listQuerySchema.safeParse(query);
  if (!result.success) return reject('Invalid query', result.error.issues);
  return result.data;
}

export function parseMessage(body: unknown): z.infer<typeof messageSchema> {
  const result = messageSchema.safeParse(body);
  if (!result.success) return reject('Invalid payload', result.error.issues);
  return result.data;
}

export function parseSpace(body: unknown): z.infer<typeof spaceSchema> {
  const result = spaceSchema.safeParse(body);
  if (!result.success) return reject('Invalid payload', result.error.issues);
  return result.data;
}

export function parseUsername(body: unknown): z.infer<typeof usernameSchema> {
  const result = usernameSchema.safeParse(body);
  if (!result.success) return reject('Invalid payload', result.error.issues);
  return result.data;
}

function reject(message: string, issues: ZodIssue[]): never {
  const errors = issues.map((issue) => ({
    fields: issue.path.map(String),
    message: issue.message,
  }));
  throw HttpError.badRequest(message, errors);
}