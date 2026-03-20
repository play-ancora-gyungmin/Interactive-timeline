import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import type { AppDependencies } from '../composition/createAppDependencies.js';
import { createRequireSession } from '../modules/auth/requireSession.js';
import { createJournalRouter } from '../modules/journal/router.js';
import type { JournalRepository } from '../modules/journal/repository.js';
import { DefaultJournalService } from '../modules/journal/service.js';
import type {
  CreateJournalInput,
  JournalEntity,
  UpdateJournalInput,
} from '../modules/journal/types.js';
import { createApiRouter } from '../modules/router.js';

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

const createEntryDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

class InMemoryJournalRepository implements JournalRepository {
  private entries: JournalEntity[] = [];

  async create(
    userId: string,
    input: CreateJournalInput,
    entryDate: Date,
  ): Promise<JournalEntity> {
    const now = new Date();
    const entity: JournalEntity = {
      id: randomUUID(),
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
      createdAt: now,
      updatedAt: now,
    };

    this.entries.push(entity);
    return this.clone(entity);
  }

  async findByIdAndUserId(
    journalId: string,
    userId: string,
  ): Promise<JournalEntity | null> {
    const entry = this.entries.find(
      (candidate) => candidate.id === journalId && candidate.userId === userId,
    );

    return entry ? this.clone(entry) : null;
  }

  async findByUserAndEntryDate(
    userId: string,
    entryDate: Date,
  ): Promise<JournalEntity | null> {
    const entry = this.entries.find(
      (candidate) =>
        candidate.userId === userId &&
        candidate.entryDate.getTime() === entryDate.getTime(),
    );

    return entry ? this.clone(entry) : null;
  }

  async listByUser(
    userId: string,
    limit: number,
    cursor?: Date,
  ): Promise<JournalEntity[]> {
    return this.entries
      .filter((entry) => {
        if (entry.userId !== userId) {
          return false;
        }

        if (!cursor) {
          return true;
        }

        return entry.entryDate.getTime() < cursor.getTime();
      })
      .sort((left, right) => right.entryDate.getTime() - left.entryDate.getTime())
      .slice(0, limit)
      .map((entry) => this.clone(entry));
  }

  async update(
    journalId: string,
    userId: string,
    input: UpdateJournalInput,
    entryDate?: Date,
  ): Promise<JournalEntity | null> {
    const index = this.entries.findIndex(
      (entry) => entry.id === journalId && entry.userId === userId,
    );
    if (index === -1) {
      return null;
    }

    const current = this.entries[index];
    const next: JournalEntity = {
      ...current,
      entryDate: entryDate ?? current.entryDate,
      mood: input.mood ?? current.mood,
      note: input.note ?? current.note,
      spotifyTrackId: input.track?.spotifyTrackId ?? current.spotifyTrackId,
      trackName: input.track?.trackName ?? current.trackName,
      artistNames: input.track?.artistNames ?? current.artistNames,
      albumName: input.track?.albumName ?? current.albumName,
      albumImageUrl: input.track?.albumImageUrl ?? current.albumImageUrl,
      spotifyUrl: input.track?.spotifyUrl ?? current.spotifyUrl,
      previewUrl: input.track?.previewUrl ?? current.previewUrl,
      updatedAt: new Date(),
    };

    this.entries[index] = next;
    return this.clone(next);
  }

  async delete(journalId: string, userId: string): Promise<boolean> {
    const before = this.entries.length;
    this.entries = this.entries.filter(
      (entry) => !(entry.id === journalId && entry.userId === userId),
    );

    return before !== this.entries.length;
  }

  private clone(entry: JournalEntity): JournalEntity {
    return {
      ...entry,
      entryDate: new Date(entry.entryDate),
      artistNames: [...entry.artistNames],
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt),
    };
  }
}

const createSessionReader = () => ({
  async getSession(headers: Headers) {
    const userId = headers.get('x-test-user-id');

    if (!userId) {
      return null;
    }

    return {
      sessionId: `session-${userId}`,
      userId,
    };
  },
});

const createAuthStub = () =>
  ({
    handler: async () => new Response('not found', { status: 404 }),
    api: {
      getSession: async () => null,
    },
  }) as unknown as AppDependencies['auth'];

const createTestDependencies = () => {
  const journalRepository = new InMemoryJournalRepository();
  const journalService = new DefaultJournalService(journalRepository);
  const requireSession = createRequireSession(createSessionReader());
  const journalRouter = createJournalRouter({
    journalService,
    requireSession,
  });
  const apiRouter = createApiRouter({
    journalRouter,
  });

  return {
    auth: createAuthStub(),
    sessionReader: createSessionReader(),
    requireSession,
    journalRepository,
    journalService,
    apiRouter,
  } satisfies AppDependencies;
};

const createJournalPayload = (entryDate: string): CreateJournalInput => ({
  entryDate,
  mood: 'calm',
  note: `note-${entryDate}`,
  track: {
    spotifyTrackId: `track-${entryDate}`,
    trackName: `Track ${entryDate}`,
    artistNames: ['Artist'],
    albumName: 'Album',
    albumImageUrl: 'https://example.com/cover.jpg',
    spotifyUrl: 'https://open.spotify.com/track/test',
    previewUrl: 'https://p.scdn.co/test.mp3',
  },
});

describe('journal routes', () => {
  let dependencies: AppDependencies;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    dependencies = createTestDependencies();
    app = createApp(dependencies);
  });

  it('returns 401 when session is missing', async () => {
    const response = await request(app).get('/api/journals');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'UNAUTHORIZED',
    });
  });

  it('creates and fetches a journal', async () => {
    const payload = createJournalPayload('2026-03-20');

    const createResponse = await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(payload);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.entryDate).toBe('2026-03-20');
    expect(createResponse.body.data.track.spotifyTrackId).toBe(
      payload.track.spotifyTrackId,
    );

    const detailResponse = await request(app)
      .get(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', TEST_USER_ID);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.note).toBe(payload.note);
  });

  it('rejects duplicate journal creation for the same day', async () => {
    const payload = createJournalPayload('2026-03-20');

    await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(payload);

    const duplicateResponse = await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(payload);

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.message).toBe(
      'A journal already exists for this date',
    );
  });

  it('returns cursor pagination without duplicates', async () => {
    for (const date of ['2026-03-22', '2026-03-21', '2026-03-20']) {
      await request(app)
        .post('/api/journals')
        .set('x-test-user-id', TEST_USER_ID)
        .send(createJournalPayload(date));
    }

    const firstPage = await request(app)
      .get('/api/journals?limit=2')
      .set('x-test-user-id', TEST_USER_ID);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.items).toHaveLength(2);
    expect(firstPage.body.data.pageInfo).toEqual({
      nextCursor: '2026-03-21',
      hasMore: true,
    });

    const secondPage = await request(app)
      .get(`/api/journals?limit=2&cursor=${firstPage.body.data.pageInfo.nextCursor}`)
      .set('x-test-user-id', TEST_USER_ID);

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.items[0].entryDate).toBe('2026-03-20');
    expect(secondPage.body.data.pageInfo).toEqual({
      nextCursor: null,
      hasMore: false,
    });
  });

  it('returns 404 for other user detail access', async () => {
    const createResponse = await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(createJournalPayload('2026-03-20'));

    const detailResponse = await request(app)
      .get(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', OTHER_USER_ID);

    expect(detailResponse.status).toBe(404);
  });

  it('returns 404 when another user tries to update a journal', async () => {
    const createResponse = await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(createJournalPayload('2026-03-20'));

    const updateResponse = await request(app)
      .patch(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', OTHER_USER_ID)
      .send({
        mood: 'happy',
      });

    expect(updateResponse.status).toBe(404);

    const detailResponse = await request(app)
      .get(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', TEST_USER_ID);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.mood).toBe('calm');
  });

  it('updates and deletes a journal', async () => {
    const createResponse = await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(createJournalPayload('2026-03-20'));

    const updateResponse = await request(app)
      .patch(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', TEST_USER_ID)
      .send({
        mood: 'happy',
        note: 'updated-note',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.mood).toBe('happy');
    expect(updateResponse.body.data.note).toBe('updated-note');

    const deleteResponse = await request(app)
      .delete(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', TEST_USER_ID);

    expect(deleteResponse.status).toBe(204);

    const detailResponse = await request(app)
      .get(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', TEST_USER_ID);

    expect(detailResponse.status).toBe(404);
  });

  it('rejects date conflicts on update', async () => {
    const first = await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(createJournalPayload('2026-03-20'));

    await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(createJournalPayload('2026-03-21'));

    const conflictResponse = await request(app)
      .patch(`/api/journals/${first.body.data.id}`)
      .set('x-test-user-id', TEST_USER_ID)
      .send({
        entryDate: '2026-03-21',
      });

    expect(conflictResponse.status).toBe(409);
  });

  it('returns 404 when another user tries to delete a journal', async () => {
    const createResponse = await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(createJournalPayload('2026-03-20'));

    const deleteResponse = await request(app)
      .delete(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', OTHER_USER_ID);

    expect(deleteResponse.status).toBe(404);

    const detailResponse = await request(app)
      .get(`/api/journals/${createResponse.body.data.id}`)
      .set('x-test-user-id', TEST_USER_ID);

    expect(detailResponse.status).toBe(200);
  });

  it('keeps entryDate stable through create and read', async () => {
    const payload = createJournalPayload('2026-03-20');

    const createResponse = await request(app)
      .post('/api/journals')
      .set('x-test-user-id', TEST_USER_ID)
      .send(payload);

    const stored = await dependencies.journalRepository.findByUserAndEntryDate(
      TEST_USER_ID,
      createEntryDate('2026-03-20'),
    );

    expect(createResponse.body.data.entryDate).toBe('2026-03-20');
    expect(stored?.entryDate.toISOString().slice(0, 10)).toBe('2026-03-20');
  });

  it('keeps health route available', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
