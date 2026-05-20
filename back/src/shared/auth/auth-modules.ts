import {AuthService} from './auth-service.js'
import {UserRepository} from './user-repository.js'
import {AuthController} from './auth-controller.js'
import {AuthRouter } from './auth-router.js'

export function AuthModule(){
    
const repository = new UserRepository();
const service = new AuthService(repository);
const controller = new AuthController(service)
const router = AuthRouter(controller)

return {
    repository,
    service,
    controller,
    router
}

}