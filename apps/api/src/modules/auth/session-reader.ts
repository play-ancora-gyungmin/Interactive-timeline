import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import type { AuthInstance } from './auth.js';

export interface AuthSession {
  sessionId: string;
  userId: string;
}

export interface SessionReader {
  getSession(rawHeaders: Headers): Promise<AuthSession | null>;
}

export class BetterAuthSessionReader implements SessionReader {
  constructor(private readonly auth: AuthInstance) {}

  async getSession(rawHeaders: Headers): Promise<AuthSession | null> {
    const session = await this.auth.api.getSession({
      headers: rawHeaders,
      query: {
        disableRefresh: true,
      },
    });

    if (!session) {
      return null;
    }

    return {
      sessionId: session.session.id,
      userId: session.user.id,
    };
  }
}

export const getHeadersFromRequest = (headers: IncomingHttpHeaders) =>
  fromNodeHeaders(headers);
