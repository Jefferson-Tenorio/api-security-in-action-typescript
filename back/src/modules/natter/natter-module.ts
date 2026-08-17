import { dbAdmin } from '../../shared/db/db.js';
import { NatterController } from './natter-controller.js';
import { NatterRepository } from './natter-repository.js';
import { NatterRouter } from './natter-router.js';
import { NatterService } from './natter-service.js';

export function NatterModule() {
  const repository = new NatterRepository(dbAdmin);
  const service = new NatterService(repository);
  const controller = new NatterController(service);
  const router = NatterRouter(controller);

  return {
    controller,
    repository,
    router,
    service,
  };
}
