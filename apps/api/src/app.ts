import express from 'express';
import cors, { CorsOptions } from 'cors';
import { router } from './routes/index.js';
import { logger } from './middlewares/logger.js';
import { requestTimer } from './middlewares/requestTimer.js';
import { config, isDevelopment, isProduction } from './config/env.config.js';
import { errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  app.get('/', (_req, res) => {
    res.json({
      name: 'Daily Music Journal API',
      endpoints: ['/api/health'],
    });
  });

  app.use('/api', router);
  app.use(errorHandler);

  return app;
}
