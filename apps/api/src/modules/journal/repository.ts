import type { PrismaClient, JournalEntry } from '../../generated/prisma/client.js';
import type {
  CreateJournalInput,
  JournalEntity,
  UpdateJournalInput,
} from './types.js';

export interface JournalRepository {
  create(userId: string, input: CreateJournalInput, entryDate: Date): Promise<JournalEntity>;
  findByIdAndUserId(journalId: string, userId: string): Promise<JournalEntity | null>;
  findByUserAndEntryDate(userId: string, entryDate: Date): Promise<JournalEntity | null>;
  listByUser(userId: string, limit: number, cursor?: Date): Promise<JournalEntity[]>;
  update(
    journalId: string,
    userId: string,
    input: UpdateJournalInput,
    entryDate?: Date,
  ): Promise<JournalEntity | null>;
  delete(journalId: string, userId: string): Promise<boolean>;
}

const mapJournalEntity = (entry: JournalEntry): JournalEntity => ({
  id: entry.id,
  userId: entry.userId,
  entryDate: entry.entryDate,
  mood: entry.mood,
  note: entry.note,
  spotifyTrackId: entry.spotifyTrackId,
  trackName: entry.trackName,
  artistNames: entry.artistNames,
  albumName: entry.albumName,
  albumImageUrl: entry.albumImageUrl ?? null,
  spotifyUrl: entry.spotifyUrl,
  previewUrl: entry.previewUrl ?? null,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const mapTrackUpdateInput = (input: Pick<UpdateJournalInput, 'track'>) =>
  input.track
    ? {
        spotifyTrackId: input.track.spotifyTrackId,
        trackName: input.track.trackName,
        artistNames: input.track.artistNames,
        albumName: input.track.albumName,
        albumImageUrl: input.track.albumImageUrl ?? null,
        spotifyUrl: input.track.spotifyUrl,
        previewUrl: input.track.previewUrl ?? null,
      }
    : {};

export class PrismaJournalRepository implements JournalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    userId: string,
    input: CreateJournalInput,
    entryDate: Date,
  ): Promise<JournalEntity> {
    const created = await this.prisma.journalEntry.create({
      data: {
        userId,
        entryDate,
        mood: input.mood,
        note: input.note,
        spotifyTrackId: input.track.spotifyTrackId,
        trackName: input.track.trackName,
        artistNames: input.track.artistNames,
        albumName: input.track.albumName,
        albumImageUrl: input.track.albumImageUrl ?? null,
        spotifyUrl: input.track.spotifyUrl,
        previewUrl: input.track.previewUrl ?? null,
      },
    });

    return mapJournalEntity(created);
  }

  async findByIdAndUserId(
    journalId: string,
    userId: string,
  ): Promise<JournalEntity | null> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: {
        id: journalId,
        userId,
      },
    });

    return entry ? mapJournalEntity(entry) : null;
  }

  async findByUserAndEntryDate(
    userId: string,
    entryDate: Date,
  ): Promise<JournalEntity | null> {
    const entry = await this.prisma.journalEntry.findUnique({
      where: {
        userId_entryDate: {
          userId,
          entryDate,
        },
      },
    });

    return entry ? mapJournalEntity(entry) : null;
  }

  async listByUser(
    userId: string,
    limit: number,
    cursor?: Date,
  ): Promise<JournalEntity[]> {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        userId,
        ...(cursor
          ? {
              entryDate: {
                lt: cursor,
              },
            }
          : {}),
      },
      orderBy: {
        entryDate: 'desc',
      },
      take: limit,
    });

    return entries.map(mapJournalEntity);
  }

  async update(
    journalId: string,
    userId: string,
    input: UpdateJournalInput,
    entryDate?: Date,
  ): Promise<JournalEntity | null> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.journalEntry.updateMany({
        where: {
          id: journalId,
          userId,
        },
        data: {
          ...(entryDate ? { entryDate } : {}),
          ...(input.mood ? { mood: input.mood } : {}),
          ...(input.note ? { note: input.note } : {}),
          ...mapTrackUpdateInput(input),
        },
      });

      if (updated.count === 0) {
        return null;
      }

      const entry = await tx.journalEntry.findFirst({
        where: {
          id: journalId,
          userId,
        },
      });

      return entry ? mapJournalEntity(entry) : null;
    });
  }

  async delete(journalId: string, userId: string): Promise<boolean> {
    const deleted = await this.prisma.journalEntry.deleteMany({
      where: {
        id: journalId,
        userId,
      },
    });

    return deleted.count > 0;
  }
}
