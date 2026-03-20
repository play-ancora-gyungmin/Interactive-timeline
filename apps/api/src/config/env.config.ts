import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const defaultPort = process.env.PORT ?? '4000';

const envSchema = z.object({
  ENVIRONMENT: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().min(1000).max(65535).default(4000),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  FRONT_URL: z.string().url().default('http://localhost:5173'),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32)
    .default('dev-only-better-auth-secret-change-me-32chars'),
  BETTER_AUTH_URL: z
    .string()
    .url()
    .default(`http://localhost:${defaultPort}`),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  DEMO_USER_ID: z
    .string()
    .uuid()
    .default('00000000-0000-4000-8000-000000000001'),
});

const parseEnvironment = () => {
  try {
    return envSchema.parse({
      ENVIRONMENT: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL,
      FRONT_URL: process.env.FRONT_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
      DEMO_USER_ID: process.env.DEMO_USER_ID,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.log('error.errors', err);
    }
    process.exit(1);
  }
};

export const config = parseEnvironment();

export const isDevelopment = () => config.ENVIRONMENT === 'development';
export const isProduction = () => config.ENVIRONMENT === 'production';
export const isTest = () => config.ENVIRONMENT === 'test';
