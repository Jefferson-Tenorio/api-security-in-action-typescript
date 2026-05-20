import { requestContext } from '../context/request-context.js';

export class ExampleService {
  private getRequestId(): string {
    return requestContext.getStore()?.requestId ?? 'no-context';
  }
  async create(data: unknown): Promise<unknown> {
    //you can acess and traced the requestid of any transaction
    const rid = this.getRequestId();
    return undefined;
  }
}
