import express from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import type { RequireSession } from '../auth/require-session.middleware.js';
import {
  createJournalSchema,
  journalIdParamsSchema,
  listJournalsQuerySchema,
  updateJournalSchema,
} from './schemas.js';
import type {
  CreateJournalInput,
  ListJournalsQuery,
  UpdateJournalInput,
} from './types.js';
import type { JournalService } from './service.js';

interface JournalRouterDependencies {
  journalService: JournalService;
  requireSession: RequireSession;
}

export function createJournalRouter({
  journalService,
  requireSession,
}: JournalRouterDependencies) {
  const router = express.Router();

  router.use(requireSession);

  router.post(
    '/',
    validate(createJournalSchema, 'body'),
    async (req, res, next) => {
      try {
        const input = req.validated?.body as CreateJournalInput;
        const created = await journalService.createJournal(req.auth!.userId, input);
        res.status(201).json({
          success: true,
          data: created,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/',
    validate(listJournalsQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        const query = req.validated?.query as ListJournalsQuery;
        const data = await journalService.listJournals(req.auth!.userId, {
          limit: query.limit,
          cursor: query.cursor,
        });

        res.json({
          success: true,
          data,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/:journalId',
    validate(journalIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const params = req.validated?.params as { journalId: string };
        const data = await journalService.getJournal(
          req.auth!.userId,
          params.journalId,
        );

        res.json({
          success: true,
          data,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/:journalId',
    validate(journalIdParamsSchema, 'params'),
    validate(updateJournalSchema, 'body'),
    async (req, res, next) => {
      try {
        const params = req.validated?.params as { journalId: string };
        const input = req.validated?.body as UpdateJournalInput;
        const data = await journalService.updateJournal(
          req.auth!.userId,
          params.journalId,
          input,
        );

        res.json({
          success: true,
          data,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/:journalId',
    validate(journalIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const params = req.validated?.params as { journalId: string };
        await journalService.deleteJournal(req.auth!.userId, params.journalId);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
