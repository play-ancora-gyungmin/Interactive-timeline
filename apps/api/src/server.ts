import { createApp } from './app.js';
import { disconnectDB } from './config/db.config.js';
import { config } from './config/env.config.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${config.PORT}`);
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
