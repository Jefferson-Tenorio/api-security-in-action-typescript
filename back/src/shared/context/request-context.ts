import { AsyncLocalStorage } from 'async_hooks';

export interface RequestUser {
  userId: string;
  username: string;
}

interface RequestStore {
  requestId: string;
  user?: RequestUser;
}

class RequestContext {
  private readonly storage = new AsyncLocalStorage<RequestStore>();

  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }

  getStore(): RequestStore | undefined {
    return this.storage.getStore();
  }

  getUser(): RequestUser | undefined {
    return this.storage.getStore()?.user;
  }

  run<T>(store: RequestStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }
}

export const requestContext = new RequestContext();