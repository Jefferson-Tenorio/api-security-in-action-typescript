import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  jti: string;
  userId: string;
  username: string;
}

export interface TokenService {
  sign(payload: Omit<TokenPayload, 'jti'>): string;
  verify(token: string): TokenPayload;
}

export class JwtService implements TokenService {
  constructor(
    private readonly privateKey: Buffer,
    private readonly publicKey: Buffer,
    private readonly expiresInMs: number,
    private readonly issuer: string,
    private readonly audience: string,
  ) {}

  sign(payload: Omit<TokenPayload, 'jti'>): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      audience: this.audience,
      expiresIn: this.expiresInMs,
      issuer: this.issuer,
      jwtid: crypto.randomUUID(),
    });
  }

  verify(token: string): TokenPayload {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      audience: this.audience,
      issuer: this.issuer,
    }) as TokenPayload;
  }
}
