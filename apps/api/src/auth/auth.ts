import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../config/db.config.js';

const getRequiredEnv = (key: 'BETTER_AUTH_SECRET' | 'BETTER_AUTH_URL') => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is required to initialize Better Auth.`);
  }

  return value;
};

const getTrustedOrigins = () =>
  (process.env.FRONT_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret: getRequiredEnv('BETTER_AUTH_SECRET'),
  baseURL: getRequiredEnv('BETTER_AUTH_URL'),
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
  },
});
