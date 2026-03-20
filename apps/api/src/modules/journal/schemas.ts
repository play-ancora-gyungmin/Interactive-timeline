import { z } from 'zod';
import { JOURNAL_MOODS } from './types.js';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateString = (value: string) => {
  if (!isoDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
};

const dateSchema = z
  .string()
  .regex(isoDatePattern, 'entryDate must be YYYY-MM-DD')
  .refine(isValidDateString, 'entryDate must be a valid calendar date');

const nullableUrlSchema = z.union([z.string().url(), z.null()]);

export const journalTrackSchema = z.object({
  spotifyTrackId: z.string().trim().min(1).max(255),
  trackName: z.string().trim().min(1).max(255),
  artistNames: z
    .array(z.string().trim().min(1).max(255))
    .min(1)
    .max(10),
  albumName: z.string().trim().min(1).max(255),
  albumImageUrl: nullableUrlSchema.optional(),
  spotifyUrl: z.string().url(),
  previewUrl: nullableUrlSchema.optional(),
});

export const createJournalSchema = z.object({
  entryDate: dateSchema,
  mood: z.enum(JOURNAL_MOODS),
  note: z.string().trim().min(1).max(2000),
  track: journalTrackSchema,
});

export const updateJournalSchema = z
  .object({
    entryDate: dateSchema.optional(),
    mood: z.enum(JOURNAL_MOODS).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
    track: journalTrackSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const listJournalsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: dateSchema.optional(),
});

export const journalIdParamsSchema = z.object({
  journalId: z.string().uuid(),
});
