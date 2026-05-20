import { AsyncLocalStorage } from 'async_hooks';

interface RequestStore {
  requestId: string;
  user?: { userId: string; username: string };
}

export const requestContext = new AsyncLocalStorage<RequestStore>();
