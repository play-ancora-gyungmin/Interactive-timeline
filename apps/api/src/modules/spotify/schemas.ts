import { z } from 'zod';

export const searchTracksQuerySchema = z.object({
  query: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
