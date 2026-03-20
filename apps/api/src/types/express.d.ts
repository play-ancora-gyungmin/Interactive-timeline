import type { AuthSession } from '../auth/session-reader.js';

declare global {
  namespace Express {
    interface ValidatedRequestData {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    }

    interface Request {
      auth?: AuthSession;
      validated?: ValidatedRequestData;
    }
  }
}

export {};
