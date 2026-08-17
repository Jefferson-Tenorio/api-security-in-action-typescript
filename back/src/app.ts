import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';

import { AuditModule } from './modules/audit_log/audit-module.js'
import { NatterModule} from './modules/natter/natter-module.js'
import { AuthModule } from './shared/auth/auth-module.js';
import { globalErrorHandler } from './shared/error/global-error-handler.js';
import { httpLogger } from './shared/http/http-logger.js';

export class App {
  public readonly instance: Application;

  constructor() {
    this.instance = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupErrorHandlers(): void {
    this.instance.use(globalErrorHandler);
  }

  private setupMiddlewares(): void {
    this.instance.disable('x-powered-by')
    this.instance.use(cors({
    credentials: true, 
    origin: 'http://localhost:5173',               
    }));
    this.instance.use(express.json());
    this.instance.use(httpLogger);


    //headers
    this.instance.use(helmet())
    this.instance.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next();
    });
    this.instance.use(cookieParser());
  }

  private setupRoutes(): void {
    const audit = AuditModule()
    const natter = NatterModule()
    const auth = AuthModule()

    this.instance.use(audit.middleware)
    this.instance.use('/natter', natter.router)
    this.instance.use('/auth', auth.router)
  }
}
