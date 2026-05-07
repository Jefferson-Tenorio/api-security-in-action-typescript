import type {Request,Response} from 'express'
import {asyncHandler} from './../utils/utils-async-handler.js'
import {AuthService} from './auth-service.js'

export class AuthController{
    constructor(private readonly service: AuthService ) {}

    login = asyncHandler(async(req:Request,res:Response)=> {
  const { username, password } = req.body;
  const token = await this.service.login(username, password);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 1000 * 60 * 15, // 15min — igual ao expiresIn do JWT
  });

  res.status(200).json({ message: 'Login realizado' });
    })

    register = asyncHandler(async(req:Request,res:Response)=> {
         const { username, password } = req.body;
        await this.service.register(username, password);
        res.status(201).json({ message: 'Usuário criado' });
    })
}


// this.instance.get('/perfil', authenticate, (req, res) => {
//   const store = requestContext.getStore();
//   res.json({ user: store?.user });
// });