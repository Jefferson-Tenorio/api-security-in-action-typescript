import { NatterRepository } from './natter-repository.js'
import { NatterService } from './natter-service.js'
import { NatterController } from './natter-controller.js'
import { CreateNatterRouter } from './natter-router.js'
import { dbAdmin } from '../../shared/db/db.js'

export function NatterModule() {
  const repository = new NatterRepository(dbAdmin)
  const service = new NatterService(repository)
  const controller = new NatterController(service)
  const router = CreateNatterRouter(controller)

  return {
    repository,
    service,
    controller,
    router,
  }
}