import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { config, isDevelopment } from '../../config/env.config.js';

const FALLBACK_SPOTIFY_USER_NAME = 'Spotify User';

const hasConfiguredValue = (value: string | undefined) =>
  typeof value === 'string' && value.trim().length > 0;

interface SpotifyProfileLike {
  display_name?: string | null;
  email?: string | null;
  images?: Array<{
    url?: string | null;
  }>;
}

const createOriginAlias = (origin: string, hostname: string) => {
  const url = new URL(origin);

  if (url.hostname === hostname) {
    return null;
  }

  url.hostname = hostname;
  return url.toString().replace(/\/$/, '');
};

const getConfiguredOrigins = () =>
  config.FRONT_URL.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const getDefaultFrontOrigin = () => getConfiguredOrigins()[0] ?? config.BETTER_AUTH_URL;

const getTrustedOrigins = () => {
  const configuredOrigins = getConfiguredOrigins();

  if (!isDevelopment()) {
    return configuredOrigins;
  }

  return [...new Set(configuredOrigins.flatMap((origin) => {
    const localhostAlias = createOriginAlias(origin, 'localhost');
    const loopbackAlias = createOriginAlias(origin, '127.0.0.1');

    return [origin, localhostAlias, loopbackAlias].filter(
      (value): value is string => Boolean(value),
    );
  }))];
};

const getSpotifyScopes = () =>
  config.SPOTIFY_AUTH_SCOPES.split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

export const isSpotifyAuthEnabled = () =>
  hasConfiguredValue(config.SPOTIFY_CLIENT_ID) &&
  hasConfiguredValue(config.SPOTIFY_CLIENT_SECRET);

const resolveSpotifyUserName = (profile: SpotifyProfileLike) => {
  const displayName =
    typeof profile.display_name === 'string' ? profile.display_name.trim() : '';
  if (displayName) {
    return displayName;
  }

  const email = typeof profile.email === 'string' ? profile.email : '';
  const emailLocalPart = email.split('@')[0]?.trim();
  if (emailLocalPart) {
    return emailLocalPart;
  }

  return FALLBACK_SPOTIFY_USER_NAME;
};

const resolveSpotifyUserImage = (profile: SpotifyProfileLike) => {
  if (!Array.isArray(profile.images)) {
    return undefined;
  }

  for (const image of profile.images) {
    if (typeof image.url === 'string') {
      return image.url;
    }
  }

  return undefined;
};

const getSpotifyProvider = () => {
  const clientId = config.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = config.SPOTIFY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret || !isSpotifyAuthEnabled()) {
    return undefined;
  }

  return {
    clientId,
    clientSecret,
    redirectURI: `${config.BETTER_AUTH_URL}/api/auth/callback/spotify`,
    scopes: getSpotifyScopes(),
    mapProfileToUser: async (profile: SpotifyProfileLike) => {
      const email =
        typeof profile.email === 'string' ? profile.email : undefined;

      return {
        name: resolveSpotifyUserName(profile),
        email,
        image: resolveSpotifyUserImage(profile),
        emailVerified: Boolean(email),
      };
    },
  };
};

export function createAuth(prisma: PrismaClient) {
  const spotifyProvider = getSpotifyProvider();

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    trustedOrigins: getTrustedOrigins(),
    onAPIError: {
      errorURL: `${getDefaultFrontOrigin()}/auth/return`,
    },
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    user: {
      modelName: 'User',
    },
    account: {
      modelName: 'Account',
    },
    session: {
      modelName: 'Session',
    },
    verification: {
      modelName: 'Verification',
    },
    socialProviders: spotifyProvider
      ? {
          spotify: spotifyProvider,
        }
      : undefined,
    plugins: [admin()],
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
