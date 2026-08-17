import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';

const privateKey = fs.readFileSync(
  path.join(import.meta.dirname, '..', '..', '..', 'private.pem'),
);
const publicKey = fs.readFileSync(
  path.join(import.meta.dirname, '..', '..', '..', 'public.pem'),
);

interface TokenPayload {
  userId: string;
  username: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m',
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
  }) as TokenPayload;
}
