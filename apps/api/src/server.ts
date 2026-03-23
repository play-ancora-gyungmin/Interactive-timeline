import { createApp } from './app.js';
import { createAppDependencies } from './composition/createAppDependencies.js';
import { disconnectDB } from './config/db.config.js';
import { config } from './config/env.config.js';

const dependencies = createAppDependencies();
const app = createApp(dependencies);
const devHost = config.ENVIRONMENT === 'development'
  ? new URL(config.BETTER_AUTH_URL).hostname
  : undefined;

const server = devHost
  ? app.listen(config.PORT, devHost, () => {
    console.log(`🚀 Server running on http://${devHost}:${config.PORT}`);
    console.log(`📦 Environment: ${config.ENVIRONMENT}`);
  })
  : app.listen(config.PORT, () => {
    console.log(`🚀 Server running on port ${config.PORT}`);
    console.log(`📦 Environment: ${config.ENVIRONMENT}`);
  });

const gracefulShutdown = async () => {
  console.log('🛑 Received kill signal, shutting down gracefully');

  server.close(() => {
    console.log('🔒 HTTP server closed');
  });

  await disconnectDB();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
