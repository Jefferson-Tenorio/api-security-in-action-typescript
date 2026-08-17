import type { Request, Response } from 'express';

import { asyncHandler } from '../utils/async-handler.js';
import { AuthService } from './auth-service.js';

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const { password, username } = req.body;
    const token = await this.service.login(username, password);

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 15, // 15min — same as the JWT expiresIn
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.status(200).json({ message: 'Login successful' });
  });

  register = asyncHandler(async (req: Request, res: Response) => {
    const { password, username } = req.body;
    await this.service.register(username, password);
    res.status(201).json({ message: 'User created' });
  });

  constructor(private readonly service: AuthService) {}
}
