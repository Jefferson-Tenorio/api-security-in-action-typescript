import cors from 'cors';
import express, { type Application } from 'express';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from './shared/error/global-error-handler.js';
import { httpLogger } from './shared/http/http-logger.js';
import { NatterModule} from './modules/natter/natter-module.js'
import { AuthModule } from './shared/auth/auth-modules.js';
import { AuditModule } from './modules/audit_log/audit-module.js'
import helmet from 'helmet';

export class App {
  public readonly instance: Application;

  constructor() {
    this.instance = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddlewares(): void {
    this.instance.disable('x-powered-by')
    this.instance.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true,               
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

  private setupErrorHandlers(): void {
    this.instance.use(globalErrorHandler);
  }
}
