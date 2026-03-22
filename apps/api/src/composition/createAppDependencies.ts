import { prisma } from '../config/db.config.js';
import { createAuth, type AuthInstance } from '../modules/auth/auth.js';
import {
  BetterAuthSessionReader,
  type SessionReader,
} from '../modules/auth/session-reader.js';
import {
  createRequireSession,
  type RequireSession,
} from '../modules/auth/require-session.middleware.js';
import {
  PrismaJournalRepository,
  type JournalRepository,
} from '../modules/journal/repository.js';
import {
  DefaultJournalService,
  type JournalService,
} from '../modules/journal/service.js';
import { createJournalRouter } from '../modules/journal/router.js';
import {
  DefaultSpotifyService,
  HttpSpotifyGateway,
  type SpotifyGateway,
  type SpotifyService,
} from '../modules/spotify/service.js';
import { createSpotifyRouter } from '../modules/spotify/router.js';
import { createApiRouter } from '../modules/router.js';
import { config } from '../config/env.config.js';

export interface AppDependencies {
  auth: AuthInstance;
  sessionReader: SessionReader;
  requireSession: RequireSession;
  spotifyGateway: SpotifyGateway;
  spotifyService: SpotifyService;
  journalRepository: JournalRepository;
  journalService: JournalService;
  apiRouter: ReturnType<typeof createApiRouter>;
}

export function createAppDependencies(): AppDependencies {
  const auth = createAuth(prisma);
  const sessionReader = new BetterAuthSessionReader(auth);
  const requireSession = createRequireSession(sessionReader);
  const spotifyGateway = new HttpSpotifyGateway(
    config.SPOTIFY_CLIENT_ID ?? '',
    config.SPOTIFY_CLIENT_SECRET ?? '',
  );
  const spotifyService = new DefaultSpotifyService(spotifyGateway);
  const journalRepository = new PrismaJournalRepository(prisma);
  const journalService = new DefaultJournalService(
    journalRepository,
    spotifyService,
  );
  const journalRouter = createJournalRouter({
    journalService,
    requireSession,
  });
  const spotifyRouter = createSpotifyRouter({
    spotifyService,
    requireSession,
  });
  const apiRouter = createApiRouter({
    journalRouter,
    spotifyRouter,
  });

  return {
    auth,
    sessionReader,
    requireSession,
    spotifyGateway,
    spotifyService,
    journalRepository,
    journalService,
    apiRouter,
  };
}
