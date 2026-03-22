import { ConflictException, NotFoundException } from '../../err/httpException.js';
import type {
  CreateJournalInput,
  JournalDetail,
  JournalEntity,
  JournalListItem,
  JournalListResult,
  ListJournalsQuery,
  UpdateJournalInput,
} from './types.js';
import type { JournalRepository } from './repository.js';
import type { SpotifyService } from '../spotify/service.js';
import type { SpotifyTrackSnapshot } from '../spotify/types.js';

const NOTE_PREVIEW_MAX_LENGTH = 120;

const normalizeEntryDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const serializeEntryDate = (value: Date) => value.toISOString().slice(0, 10);

const serializeTimestamp = (value: Date) => value.toISOString();

const createStoredTrack = (entity: JournalEntity): SpotifyTrackSnapshot => ({
  spotifyTrackId: entity.spotifyTrackId,
  trackName: entity.trackName,
  artistNames: entity.artistNames,
  albumName: entity.albumName,
  albumImageUrl: entity.albumImageUrl,
  spotifyUrl: entity.spotifyUrl,
  previewUrl: entity.previewUrl,
});

const createDetail = (
  entity: JournalEntity,
  track: SpotifyTrackSnapshot,
): JournalDetail => ({
  id: entity.id,
  entryDate: serializeEntryDate(entity.entryDate),
  mood: entity.mood,
  note: entity.note,
  track,
  createdAt: serializeTimestamp(entity.createdAt),
  updatedAt: serializeTimestamp(entity.updatedAt),
});

const createListItem = (
  entity: JournalEntity,
  track: SpotifyTrackSnapshot,
): JournalListItem => ({
  id: entity.id,
  entryDate: serializeEntryDate(entity.entryDate),
  mood: entity.mood,
  notePreview: entity.note.slice(0, NOTE_PREVIEW_MAX_LENGTH),
  track,
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
  constructor(
    private readonly journalRepository: JournalRepository,
    private readonly spotifyService: SpotifyService,
  ) {}

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

    const track = await this.spotifyService.requireTrackById(input.spotifyTrackId);
    const created = await this.journalRepository.create(
      userId,
      input,
      entryDate,
      track,
    );
    return createDetail(created, track);
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
    const tracksById = await this.spotifyService.getTracksByIds(
      visibleEntries.map((entry) => entry.spotifyTrackId),
    );

    return {
      items: visibleEntries.map((entry) =>
        createListItem(
          entry,
          tracksById.get(entry.spotifyTrackId) ?? createStoredTrack(entry),
        ),
      ),
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

    const track =
      (await this.spotifyService.getTrackById(entry.spotifyTrackId)) ??
      createStoredTrack(entry);

    return createDetail(entry, track);
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

    const nextTrack = input.spotifyTrackId
      ? await this.spotifyService.requireTrackById(input.spotifyTrackId)
      : undefined;

    const updated = await this.journalRepository.update(
      journalId,
      userId,
      input,
      nextEntryDate,
      nextTrack,
    );

    if (!updated) {
      throw new NotFoundException('Journal not found');
    }

    return createDetail(updated, nextTrack ?? createStoredTrack(updated));
  }

  async deleteJournal(userId: string, journalId: string): Promise<void> {
    const deleted = await this.journalRepository.delete(journalId, userId);

    if (!deleted) {
      throw new NotFoundException('Journal not found');
    }
  }
}
