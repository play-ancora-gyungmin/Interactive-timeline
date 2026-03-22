import express from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import type { RequireSession } from '../auth/require-session.middleware.js';
import { searchTracksQuerySchema } from './schemas.js';
import type { SpotifyService } from './service.js';
import type { SpotifyTrackSearchQuery } from './types.js';

interface SpotifyRouterDependencies {
  spotifyService: SpotifyService;
  requireSession: RequireSession;
}

export function createSpotifyRouter({
  spotifyService,
  requireSession,
}: SpotifyRouterDependencies) {
  const router = express.Router();

  router.use(requireSession);

  router.get(
    '/tracks/search',
    validate(searchTracksQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        const query = req.validated?.query as SpotifyTrackSearchQuery;
        const data = await spotifyService.searchTracks(query);

        res.json({
          success: true,
          data,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
