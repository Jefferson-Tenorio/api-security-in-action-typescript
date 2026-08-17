import { requestContext } from '../context/request-context.js';

export class ExampleService {
  async create(): Promise<unknown> {
    //you can acess and traced the requestid of any transaction
    return this.getRequestId();
  }
  private getRequestId(): string {
    return requestContext.getStore()?.requestId ?? 'no-context';
  }
}
