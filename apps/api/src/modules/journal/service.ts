import { ConflictException, NotFoundException } from '../../err/httpException.js';
import type {
  CreateJournalInput,
  JournalDetail,
  JournalEntity,
  JournalListItem,
  JournalListResult,
  JournalTrackInput,
  ListJournalsQuery,
  UpdateJournalInput,
} from './types.js';
import type { JournalRepository } from './repository.js';

const NOTE_PREVIEW_MAX_LENGTH = 120;

const normalizeEntryDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const serializeEntryDate = (value: Date) => value.toISOString().slice(0, 10);

const serializeTimestamp = (value: Date) => value.toISOString();

const createTrack = (entity: JournalEntity): JournalTrackInput => ({
  spotifyTrackId: entity.spotifyTrackId,
  trackName: entity.trackName,
  artistNames: entity.artistNames,
  albumName: entity.albumName,
  albumImageUrl: entity.albumImageUrl,
  spotifyUrl: entity.spotifyUrl,
  previewUrl: entity.previewUrl,
});

const createDetail = (entity: JournalEntity): JournalDetail => ({
  id: entity.id,
  entryDate: serializeEntryDate(entity.entryDate),
  mood: entity.mood,
  note: entity.note,
  track: createTrack(entity),
  createdAt: serializeTimestamp(entity.createdAt),
  updatedAt: serializeTimestamp(entity.updatedAt),
});

const createListItem = (entity: JournalEntity): JournalListItem => ({
  id: entity.id,
  entryDate: serializeEntryDate(entity.entryDate),
  mood: entity.mood,
  notePreview: entity.note.slice(0, NOTE_PREVIEW_MAX_LENGTH),
  trackName: entity.trackName,
  artistNames: entity.artistNames,
  albumImageUrl: entity.albumImageUrl,
  spotifyUrl: entity.spotifyUrl,
});

export interface JournalService {
  createJournal(userId: string, input: CreateJournalInput): Promise<JournalDetail>;
  listJournals(userId: string, query: ListJournalsQuery): Promise<JournalListResult>;
  getJournal(userId: string, journalId: string): Promise<JournalDetail>;
  updateJournal(
    userId: string,
    journalId: string,
    input: UpdateJournalInput,
  ): Promise<JournalDetail>;
  deleteJournal(userId: string, journalId: string): Promise<void>;
}

export class DefaultJournalService implements JournalService {
  constructor(private readonly journalRepository: JournalRepository) {}

  async createJournal(
    userId: string,
    input: CreateJournalInput,
  ): Promise<JournalDetail> {
    const entryDate = normalizeEntryDate(input.entryDate);
    const existing = await this.journalRepository.findByUserAndEntryDate(
      userId,
      entryDate,
    );

    if (existing) {
      throw new ConflictException('A journal already exists for this date');
    }

    const created = await this.journalRepository.create(userId, input, entryDate);
    return createDetail(created);
  }

  async listJournals(
    userId: string,
    query: ListJournalsQuery,
  ): Promise<JournalListResult> {
    const limit = query.limit;
    const cursor = query.cursor ? normalizeEntryDate(query.cursor) : undefined;
    const entries = await this.journalRepository.listByUser(
      userId,
      limit + 1,
      cursor,
    );

    const hasMore = entries.length > limit;
    const visibleEntries = hasMore ? entries.slice(0, limit) : entries;
    const lastEntry = visibleEntries[visibleEntries.length - 1];

    return {
      items: visibleEntries.map(createListItem),
      pageInfo: {
        nextCursor: hasMore && lastEntry ? serializeEntryDate(lastEntry.entryDate) : null,
        hasMore,
      },
    };
  }

  async getJournal(userId: string, journalId: string): Promise<JournalDetail> {
    const entry = await this.journalRepository.findByIdAndUserId(journalId, userId);

    if (!entry) {
      throw new NotFoundException('Journal not found');
    }

    return createDetail(entry);
  }

  async updateJournal(
    userId: string,
    journalId: string,
    input: UpdateJournalInput,
  ): Promise<JournalDetail> {
    const current = await this.journalRepository.findByIdAndUserId(journalId, userId);

    if (!current) {
      throw new NotFoundException('Journal not found');
    }

    const nextEntryDate = input.entryDate
      ? normalizeEntryDate(input.entryDate)
      : undefined;

    if (nextEntryDate) {
      const conflictingEntry = await this.journalRepository.findByUserAndEntryDate(
        userId,
        nextEntryDate,
      );

      if (conflictingEntry && conflictingEntry.id !== current.id) {
        throw new ConflictException('A journal already exists for this date');
      }
    }

    const updated = await this.journalRepository.update(
      journalId,
      userId,
      input,
      nextEntryDate,
    );

    if (!updated) {
      throw new NotFoundException('Journal not found');
    }

    return createDetail(updated);
  }

  async deleteJournal(userId: string, journalId: string): Promise<void> {
    const deleted = await this.journalRepository.delete(journalId, userId);

    if (!deleted) {
      throw new NotFoundException('Journal not found');
    }
  }
}
