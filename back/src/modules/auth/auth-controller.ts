import type { Request, Response } from 'express';

import { env } from '../../config/env.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { parseCredentials } from './auth-schemas.js';
import { AuthService } from './auth-service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
};

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const { password, username } = parseCredentials(req.body);
    const token = await this.service.login(username, password);

    res.cookie('token', token, {
      ...COOKIE_OPTIONS,
      maxAge: env.jwt.expiresInMs,
    });

    res.status(200).json({ message: 'Login successful' });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const token = typeof req.cookies.token === 'string' ? req.cookies.token : undefined;
    await this.service.logout(token);
    res.clearCookie('token', COOKIE_OPTIONS);
    res.status(200).json({ message: 'Logged out' });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const { password, username } = parseCredentials(req.body);
    await this.service.register(username, password);
    res.status(201).json({ message: 'User created' });
  });

  constructor(private readonly service: AuthService) {}
}