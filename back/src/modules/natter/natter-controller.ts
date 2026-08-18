import type { Request, Response } from 'express';

import { HttpError } from '../../shared/error/http-error.js';
import { asyncHandler } from '../../shared/utils/async-handler.js';
import { NatterService } from './natter-service.js';
import { isContent, isMessage, isSpace, parseId } from './natter-validation.js';

export class NatterController {
  createMessage = asyncHandler(async (req: Request, res: Response) => {
    if (!isMessage(req.body)) throw HttpError.badRequest('Invalid payload');
    const message = await this.service.createMessage(req.body);
    res.status(200).json(message);
  });

  createSpace = asyncHandler(async (req: Request, res: Response) => {
    if (!isSpace(req.body)) throw HttpError.badRequest('Invalid payload');
    const space = await this.service.createSpace(req.body);
    res.status(200).json(space);
  });

  deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteMessage(parseId(req.params.id));
    res.status(204).end();
  });

  deleteSpace = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteSpace(parseId(req.params.id));
    res.status(204).end();
  });

  findAllMessages = asyncHandler(async (_req: Request, res: Response) => {
    const messages = await this.service.findAllMessages();
    res.status(200).json(messages);
  });

  findAllSpace = asyncHandler(async (_req: Request, res: Response) => {
    const spaces = await this.service.findAllSpaces();
    res.status(200).json(spaces);
  });

  findByIdMessage = asyncHandler(async (req: Request, res: Response) => {
    const message = await this.service.findByIdMessage(parseId(req.params.id));
    res.status(200).json(message);
  });

  findByIdSpace = asyncHandler(async (req: Request, res: Response) => {
    const space = await this.service.findByIdSpace(parseId(req.params.id));
    res.status(200).json(space);
  });

  updateMessage = asyncHandler(async (req: Request, res: Response) => {
    if (!isContent(req.body.content)) throw HttpError.badRequest('Invalid payload');
    const message = await this.service.updateMessage(
      parseId(req.params.id),
      req.body.content,
    );
    res.status(200).json(message);
  });

  constructor(private readonly service: NatterService) {}
}