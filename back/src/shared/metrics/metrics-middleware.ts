import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { Metrics } from './metrics.js';

export function metricsMiddleware(metrics: Metrics): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      const route = req.route?.path ?? req.path;
      metrics.record(req.method, route, res.statusCode);
      if (metrics.shouldAlert()) {
        console.warn(
          JSON.stringify({
            event: 'metrics_anomaly',
            level: 'warn',
            message: 'High server error ratio in recent requests',
          }),
        );
      }
    });
    next();
  };
}