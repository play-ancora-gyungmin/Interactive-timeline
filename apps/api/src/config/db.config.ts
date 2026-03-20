import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config, isDevelopment } from './env.config.js';

const getPrismaLogLevel = () => {
  if (!isDevelopment()) {
    return ['warn', 'error'] as Prisma.LogLevel[];
  }
  //개발 환경에서만 추가 로깅 개방
  return ['query', 'info', 'warn', 'error'] as Prisma.LogLevel[];
};

export function createPrismaClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: getPrismaLogLevel(),
  });

  return { prisma, pool };
}

const database = createPrismaClient(config.DATABASE_URL);

export const prisma = database.prisma;

export async function disconnectDB(): Promise<void> {
  try {
    await prisma.$disconnect();
    await database.pool.end();
    console.log('📦 Disconnected from the database.');
  } catch (e) {
    console.error('❌ Error disconnecting from the database:', e);
    process.exit(1);
  }
}
