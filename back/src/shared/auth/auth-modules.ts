import {AuthController} from './auth-controller.js'
import {AuthRouter } from './auth-router.js'
import {AuthService} from './auth-service.js'
import {UserRepository} from './user-repository.js'

export function AuthModule(){
    
const repository = new UserRepository();
const service = new AuthService(repository);
const controller = new AuthController(service)
const router = AuthRouter(controller)

return {
    controller,
    repository,
    router,
    service
}

}