import path from 'path';
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const certsDir = path.join(import.meta.dirname, '..', '..', 'certs');

export const env = {
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL'),
  databaseUrlAdmin: required('DATABASE_URL_ADMIN'),
  jwt: {
    audience: process.env.JWT_AUDIENCE ?? 'natter-web',
    expiresInMs: Number(process.env.JWT_EXPIRES_IN_MS) || 15 * 60 * 1000,
    issuer: process.env.JWT_ISSUER ?? 'natter-api',
    privateKeyPath:
      process.env.JWT_PRIVATE_KEY_PATH ?? path.join(certsDir, 'private.pem'),
    publicKeyPath:
      process.env.JWT_PUBLIC_KEY_PATH ?? path.join(certsDir, 'public.pem'),
  },
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT) || 3000,
  timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 30_000,
} as const;