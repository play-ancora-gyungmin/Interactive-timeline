import express from 'express';

interface ApiRouterDependencies {
  journalRouter: express.Router;
}

export function createApiRouter({ journalRouter }: ApiRouterDependencies) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.use('/journals', journalRouter);

  return router;
}
