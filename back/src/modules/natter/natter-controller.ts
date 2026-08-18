import type { Request, Response } from 'express';

import { asyncHandler } from '../../shared/utils/async-handler.js';
import { NatterService } from './natter-service.js';
import {
  parseContent,
  parseId,
  parseListQuery,
  parseMessage,
  parseSpace,
  parseUsername,
} from './natter-validation.js';

export class NatterController {
  addMember = asyncHandler(async (req: Request, res: Response) => {
    const member = await this.service.addMember(
      parseId(req.params.id),
      parseUsername(req.body).username,
    );
    res.status(200).json(member);
  });

  createMessage = asyncHandler(async (req: Request, res: Response) => {
    const message = await this.service.createMessage(parseMessage(req.body));
    res.status(200).json(message);
  });

  createSpace = asyncHandler(async (req: Request, res: Response) => {
    const space = await this.service.createSpace(parseSpace(req.body));
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

  findAllMessages = asyncHandler(async (req: Request, res: Response) => {
    const messages = await this.service.findAllMessages(
      parseListQuery(req.query),
    );
    res.status(200).json(messages);
  });

  findAllSpace = asyncHandler(async (req: Request, res: Response) => {
    const spaces = await this.service.findAllSpaces(parseListQuery(req.query));
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

  listMembers = asyncHandler(async (req: Request, res: Response) => {
    const members = await this.service.listMembers(parseId(req.params.id));
    res.status(200).json(members);
  });

  removeMember = asyncHandler(async (req: Request, res: Response) => {
    const username = req.params.username;
    if (typeof username !== 'string') throw new Error('Missing username');
    await this.service.removeMember(parseId(req.params.id), username);
    res.status(204).end();
  });

  updateMessage = asyncHandler(async (req: Request, res: Response) => {
    const message = await this.service.updateMessage(
      parseId(req.params.id),
      parseContent(req.body).content,
    );
    res.status(200).json(message);
  });

  constructor(private readonly service: NatterService) {}
}