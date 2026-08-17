import { Router } from 'express'

import {authenticate} from '../../shared/auth/auth-middleware.js'
import { defaultLimiter, writeLimiter } from '../../shared/utils/utils-rate-limit.js'
import { NatterController} from './natter-controller.js'


export function CreateNatterRouter(controller: NatterController): Router {
    const router = Router()

    router.use(authenticate)

    // message
    router.post('/message',writeLimiter,controller.create)
    router.get('/message',defaultLimiter,controller.findAllMessage)
    router.get('/message/:id', defaultLimiter,controller.findByIdMessage)
    router.put('/message/:id',writeLimiter, controller.updateMessage)
    router.delete('/message/:id',writeLimiter, controller.deleteMessage)

    // space
    router.post('/space',writeLimiter, controller.create)
    router.get('/space', defaultLimiter,controller.findAllSpace)
    router.get('/space/:id',defaultLimiter, controller.findByIdSpace)
    router.delete('/space/:id',writeLimiter, controller.deleteSpace)

    return router
}