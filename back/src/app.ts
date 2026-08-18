import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
import { AuditModule } from './modules/audit_log/audit-module.js';
import { AuthModule } from './modules/auth/auth-module.js';
import { NatterModule } from './modules/natter/natter-module.js';
import { requestContextMiddleware } from './shared/context/request-context-middleware.js';
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
    this.instance.disable('x-powered-by');
    this.instance.use(requestContextMiddleware);
    this.instance.use(
      cors({
        credentials: true,
        origin: env.corsOrigin,
      }),
    );
    this.instance.use(express.json());
    this.instance.use(httpLogger);

    //headers
    this.instance.use(helmet());
    this.instance.use((_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next();
    });
    this.instance.use(cookieParser());
  }

  private setupRoutes(): void {
    const audit = AuditModule();
    const auth = AuthModule();
    const natter = NatterModule(auth.authenticate);

    this.instance.use(audit.middleware);
    this.instance.use('/auth', auth.router);
    this.instance.use('/natter', natter.router);
  }
}