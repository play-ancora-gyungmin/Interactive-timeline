import express from 'express';
import cors, { CorsOptions } from 'cors';
import { toNodeHandler } from 'better-auth/node';
import type { AppDependencies } from './composition/createAppDependencies.js';
import { logger } from './middlewares/logger.middleware.js';
import { requestTimer } from './middlewares/request-timer.middleware.js';
import { config, isDevelopment, isProduction } from './config/env.config.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';

export function createApp(dependencies: AppDependencies) {
  const app = express();

  const whiteList: string[] = config.FRONT_URL
    ? config.FRONT_URL.split(',').map((url) => url.trim())
    : [];

  const corsOptions: CorsOptions = {
    origin: isProduction() ? whiteList : true,
    credentials: true,
  };

  app.use(cors(corsOptions));

  if (isDevelopment()) {
    app.use(logger);
    app.use(requestTimer);
  }

  app.all('/api/auth/*splat', toNodeHandler(dependencies.auth));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (_req, res) => {
    res.json({
      name: 'Daily Music Journal API',
      endpoints: ['/api/auth/*', '/api/health', '/api/journals'],
    });
  });

  app.use('/api', dependencies.apiRouter);
  app.use(errorHandler);

  return app;
}
