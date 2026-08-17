import  type { Request, Response } from 'express';

import { HttpError } from "../../shared/error/http-error.js";
import { asyncHandler } from '../../shared/utils/utils-async-handler.js'
import { IsMessage, IsSpace, type Message, NatterService, type Space } from "./natter-service.js";

export class NatterController{
    create = asyncHandler(async (req:Request,res:Response)=>{
            const object = req.body
            if(IsMessage(object)){
                const result = await this.service.create(object as Message)
                res.status(200).json(result)
            }
            else if(IsSpace(object)){
                const result = await this.service.create(object as Space)
                res.status(200).json(result)
            } else {            
                throw HttpError.badRequest('Invalid payload');
            }
    })

    deleteMessage = asyncHandler(async (req:Request,res:Response)=>{
        await this.service.deleteMessage(req.params.id as string)
        res.status(204).send({message: "deleted"})
    })
    deleteSpace = asyncHandler(async (req:Request,res:Response)=>{
        await this.service.deleteSpace(req.params.id as string)
        res.status(204).send({message: "deleted"});
    })
    findAllMessage = asyncHandler(async (req:Request,res:Response)=>{
        const message = await this.service.findAllMessages()
        res.status(200).json(message)
    })
    findAllSpace = asyncHandler(async (req:Request,res:Response)=>{
        const space = await this.service.findAllSpace()
        res.status(200).json(space)
    })
    findByIdMessage = asyncHandler(async (req:Request,res:Response)=>{
        const message = await this.service.findByIdMessage(req.params.id as string)
        res.status(200).json(message)
    })
    findByIdSpace = asyncHandler(async (req:Request,res:Response)=>{
        const space = await this.service.findByIdSpace(req.params.id as string)
        res.status(200).json(space)
    })
    updateMessage = asyncHandler(async (req:Request,res:Response)=>{
        const message = await this.service.updateMessage(req.params.id as string, req.body.content as string)
        res.status(200).json(message)
    })
    constructor(private readonly service: NatterService) {}
}