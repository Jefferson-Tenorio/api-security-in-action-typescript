import { z } from 'zod';

import { HttpError } from '../../shared/error/http-error.js';

export const credentialsSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Username contains invalid characters'),
  })
  .strict();

export type Credentials = z.infer<typeof credentialsSchema>;

export function parseCredentials(body: unknown): Credentials {
  const result = credentialsSchema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      fields:
        issue.code === 'unrecognized_keys'
          ? issue.keys
          : issue.path.map(String),
      message: issue.message,
    }));
    throw HttpError.badRequest('Invalid payload', errors);
  }
  return result.data;
}