import type { RequestHandler } from 'express';
import { UnauthorizedException } from '../err/httpException.js';
import {
  getHeadersFromRequest,
  type SessionReader,
} from '../auth/session-reader.js';

export type RequireSession = RequestHandler;

export function createRequireSession(sessionReader: SessionReader) {
  const requireSession: RequestHandler = async (req, _res, next) => {
    try {
      const session = await sessionReader.getSession(
        getHeadersFromRequest(req.headers),
      );

      if (!session) {
        next(new UnauthorizedException());
        return;
      }

      req.auth = session;
      next();
    } catch (error) {
      next(error);
    }
  };

  return requireSession;
}
