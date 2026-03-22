import express from 'express';

interface ApiRouterDependencies {
  journalRouter: express.Router;
  spotifyRouter: express.Router;
  spotifyAuthEnabled: boolean;
}

export function createApiRouter({
  journalRouter,
  spotifyRouter,
  spotifyAuthEnabled,
}: ApiRouterDependencies) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      auth: {
        spotifyEnabled: spotifyAuthEnabled,
      },
    });
  });

  router.use('/journals', journalRouter);
  router.use('/spotify', spotifyRouter);

  return router;
}
