import type { Message, Space } from './natter-types.js';

import { HttpError } from '../../shared/error/http-error.js';
import { NatterRepository } from './natter-repository.js';

export class NatterService {
  constructor(private readonly natterRepo: NatterRepository) {}

  async createMessage(data: Message): Promise<Message> {
    return this.natterRepo.createMessage(data);
  }

  async createSpace(data: Space): Promise<Space> {
    return this.natterRepo.createSpace(data);
  }

  async deleteMessage(id: string): Promise<void> {
    await this.natterRepo.deleteMessage(id);
  }

  async deleteSpace(id: string): Promise<void> {
    await this.natterRepo.deleteSpace(id);
  }

  async findAllMessages(): Promise<Message[]> {
    const result = await this.natterRepo.findAllMessages();
    if (!result) throw HttpError.unprocessable('Entity not found');
    return result;
  }

  async findAllSpaces(): Promise<Space[]> {
    const result = await this.natterRepo.findAllSpaces();
    if (!result) throw HttpError.unprocessable('Entity not found');
    return result;
  }

  async findByIdMessage(id: string): Promise<Message> {
    if (!id) throw HttpError.badRequest('Id cannot be empty');
    const result = await this.natterRepo.findByIdMessage(id);
    if (!result) throw HttpError.unprocessable('Entity not found');
    return result;
  }

  async findByIdSpace(id: string): Promise<Space> {
    if (!id) throw HttpError.badRequest('Id cannot be empty');
    const result = await this.natterRepo.findByIdSpace(id);
    if (!result) throw HttpError.unprocessable('Entity not found');
    return result;
  }

  async updateMessage(id: string, content: string): Promise<Message> {
    if (!content) throw HttpError.badRequest('Content cannot be empty');
    return this.natterRepo.updateMessage(id, content);
  }
}

// TODO: Observar os erros e as regras de negócio e organizar o código e a role de quem pode logar e quem não pode porque eu mudei o db
// TODO: [a-zA-Z][a-zA-Z0-9]{1,29}
// TODO: Tip In a real project, you could confirm the user's identity during registration (by sending them an email or validating their credit card, for example), or you might use an existing user repository and not allow users to self-register.
