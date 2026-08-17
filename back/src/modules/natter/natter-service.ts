import { HttpError } from '../../shared/error/http-error.js'
import { NatterRepository } from './natter-repository.js'

export type Message = {
    author: string
    content: string,
    space_id: string,
}

export type Space = {
    name: string
    owner: string,
}

export class NatterService {
    constructor(private readonly natterRepo: NatterRepository) {}

    async create(data: Message | Space): Promise<Message | Space>{
        if(IsMessage(data)){
            return await this.natterRepo.createMessage(data)
        }
        if(IsSpace(data)){
            return await  this.natterRepo.createSpace(data)
        }
        throw HttpError.badRequest("Its not a valide config")
    }

    async deleteMessage(id: string): Promise<void>{
        await this.natterRepo.deleteMessage(id)
    }

    async deleteSpace(id: string): Promise<void>{
        await this.natterRepo.deleteSpace(id)
    }

    async findAllMessages(): Promise<Message[]>{
        const result = await this.natterRepo.findAllMessages()
        if(!result) throw HttpError.unprocessable("Its not a valide entity")
        return result
    }

    async findAllSpace(): Promise<Space[]>{
       const result = await this.natterRepo.findAllSpaces()
        if(!result) throw HttpError.unprocessable("Its not a valide entity")
        return result
    }

    async findByIdMessage(id: string): Promise<Message | null>{
        if(!id) throw HttpError.badRequest('Its cant be null')
        const result = await this.natterRepo.findByIdMessage(id)
        if(!result) throw HttpError.unprocessable("Its not a valide entity")
        return result
    } 

    async findByIdSpace(id: string): Promise<null | Space>{
        if(!id) throw HttpError.badRequest('Its cant be null')
        const result = await this.natterRepo.findByIdSpace(id)
        if(!result) throw HttpError.unprocessable("Its not a valide entity")
        return result
    }

    async updateMessage(id:string,content: string): Promise<Message>{
        if(!content) throw HttpError.badRequest("cant be not null")
        const result = await this.natterRepo.updateMessage(id,content)
        return result
    }
}

export function IsMessage(raw: unknown): raw is Message{
  if(typeof raw !== "object" || raw === null) return false

  const normalized = raw as Record<string,unknown>

  return(
    typeof normalized.content === "string" &&
    typeof normalized.space_id === "string" &&
    typeof normalized.author === "string"
  )
}

export function IsSpace(raw: unknown): raw is Space{
  if(typeof raw !== "object" || raw === null) return false

  const normalized = raw as Record<string,unknown>

  return(
    typeof normalized.name === "string" &&
    typeof normalized.owner === "string" 
  )
}

//TODO: Observar os erros e as regras de negócio e organizar o código e a role de quem pode logar e quem não pode porque eu mudei o db
//TODO: [a-zA-Z][a-zA-Z0-9]{1,29}
//TODO: Tip In a real project, you could confirm the user’s identity during registration (by sending them an email or validating their credit card, for example), or you might use an existing user repository and not allow users to self-register.