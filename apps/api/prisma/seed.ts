import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const demoUserId =
  process.env.DEMO_USER_ID ?? '00000000-0000-4000-8000-000000000001';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const demoUser = await prisma.user.upsert({
    where: {
      email: 'demo@dailymusicjournal.local',
    },
    update: {
      name: 'Demo User',
      emailVerified: true,
    },
    create: {
      id: demoUserId,
      name: 'Demo User',
      email: 'demo@dailymusicjournal.local',
      emailVerified: true,
    },
  });

  console.log(`Seeded demo user: ${demoUser.email}`);
}

main()
  .catch((error) => {
    console.error('Failed to seed demo data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
