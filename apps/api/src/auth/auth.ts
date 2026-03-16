import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { prisma } from '../config/db.config.js';
import { config } from '../config/env.config.js';

const getTrustedOrigins = () =>
  config.FRONT_URL.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
  advanced: {
    database: {
      generateId: 'uuid',
    },
  },
  user: {
    modelName: 'users',
  },
  account: {
    modelName: 'accounts',
  },
  session: {
    modelName: 'sessions',
  },
  verification: {
    modelName: 'verifications',
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
});
