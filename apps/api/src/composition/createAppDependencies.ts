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
import { createApiRouter } from '../modules/router.js';

export interface AppDependencies {
  auth: AuthInstance;
  sessionReader: SessionReader;
  requireSession: RequireSession;
  journalRepository: JournalRepository;
  journalService: JournalService;
  apiRouter: ReturnType<typeof createApiRouter>;
}

export function createAppDependencies(): AppDependencies {
  const auth = createAuth(prisma);
  const sessionReader = new BetterAuthSessionReader(auth);
  const requireSession = createRequireSession(sessionReader);
  const journalRepository = new PrismaJournalRepository(prisma);
  const journalService = new DefaultJournalService(journalRepository);
  const journalRouter = createJournalRouter({
    journalService,
    requireSession,
  });
  const apiRouter = createApiRouter({
    journalRouter,
  });

  return {
    auth,
    sessionReader,
    requireSession,
    journalRepository,
    journalService,
    apiRouter,
  };
}
