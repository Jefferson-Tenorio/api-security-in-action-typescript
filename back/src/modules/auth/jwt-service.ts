import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  username: string;
}

export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}

export class JwtService implements TokenService {
  constructor(
    private readonly privateKey: Buffer,
    private readonly publicKey: Buffer,
    private readonly expiresInMs: number,
  ) {}

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.expiresInMs,
    });
  }

  verify(token: string): TokenPayload {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    }) as TokenPayload;
  }
}