import { BadRequestException, HttpException } from '../../err/httpException.js';
import type {
  SpotifyTrackSearchQuery,
  SpotifyTrackSnapshot,
} from './types.js';

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface SpotifyImage {
  url?: string;
}

interface SpotifyArtist {
  name?: string;
}

interface SpotifyAlbum {
  name?: string;
  images?: SpotifyImage[];
}

interface SpotifyTrackItem {
  id?: string;
  name?: string;
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
  external_urls?: {
    spotify?: string;
  };
  preview_url?: string | null;
}

interface SpotifySearchResponse {
  tracks?: {
    items?: SpotifyTrackItem[];
  };
}

interface SpotifyTracksResponse {
  tracks?: SpotifyTrackItem[];
}

export interface SpotifyGateway {
  searchTracks(query: string, limit: number): Promise<SpotifyTrackSnapshot[]>;
  getTrackById(trackId: string): Promise<SpotifyTrackSnapshot | null>;
  getTracksByIds(trackIds: string[]): Promise<Map<string, SpotifyTrackSnapshot>>;
}

const SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';
const ACCESS_TOKEN_SAFETY_MARGIN_MS = 60_000;

const createTrackSnapshot = (
  track: SpotifyTrackItem,
): SpotifyTrackSnapshot | null => {
  if (!track.id || !track.name || !track.album?.name || !track.external_urls?.spotify) {
    return null;
  }

  const artistNames = (track.artists ?? [])
    .map((artist) => artist.name?.trim())
    .filter((name): name is string => Boolean(name));

  if (artistNames.length === 0) {
    return null;
  }

  return {
    spotifyTrackId: track.id,
    trackName: track.name,
    artistNames,
    albumName: track.album.name,
    albumImageUrl: track.album.images?.[0]?.url ?? null,
    spotifyUrl: track.external_urls.spotify,
    previewUrl: track.preview_url ?? null,
  };
};

export class HttpSpotifyGateway implements SpotifyGateway {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async searchTracks(
    query: string,
    limit: number,
  ): Promise<SpotifyTrackSnapshot[]> {
    const url = new URL(`${SPOTIFY_API_BASE_URL}/search`);
    url.searchParams.set('type', 'track');
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));

    const response = await this.spotifyFetch<SpotifySearchResponse>(url);
    if (!response) {
      return [];
    }

    return (response.tracks?.items ?? [])
      .map(createTrackSnapshot)
      .filter((track): track is SpotifyTrackSnapshot => track !== null);
  }

  async getTrackById(trackId: string): Promise<SpotifyTrackSnapshot | null> {
    const url = new URL(`${SPOTIFY_API_BASE_URL}/tracks/${trackId}`);
    const response = await this.spotifyFetch<SpotifyTrackItem>(url, {
      allowNotFound: true,
    });

    return response ? createTrackSnapshot(response) : null;
  }

  async getTracksByIds(
    trackIds: string[],
  ): Promise<Map<string, SpotifyTrackSnapshot>> {
    if (trackIds.length === 0) {
      return new Map();
    }

    const uniqueTrackIds = [...new Set(trackIds)];
    const result = new Map<string, SpotifyTrackSnapshot>();

    for (let index = 0; index < uniqueTrackIds.length; index += 50) {
      const chunk = uniqueTrackIds.slice(index, index + 50);
      const url = new URL(`${SPOTIFY_API_BASE_URL}/tracks`);
      url.searchParams.set('ids', chunk.join(','));

      const response = await this.spotifyFetch<SpotifyTracksResponse>(url);
      if (!response) {
        continue;
      }

      for (const item of response.tracks ?? []) {
        const track = createTrackSnapshot(item);
        if (track) {
          result.set(track.spotifyTrackId, track);
        }
      }
    }

    return result;
  }

  private async spotifyFetch<T>(
    url: URL,
    options: { allowNotFound?: boolean } = {},
  ): Promise<T | null> {
    const token = await this.getAccessToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      this.accessToken = null;
      this.accessTokenExpiresAt = 0;

      const retriedToken = await this.getAccessToken();
      const retriedResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${retriedToken}`,
        },
      });

      return this.parseSpotifyResponse<T>(retriedResponse, options);
    }

    return this.parseSpotifyResponse<T>(response, options);
  }

  private async parseSpotifyResponse<T>(
    response: Response,
    options: { allowNotFound?: boolean },
  ): Promise<T | null> {
    if (options.allowNotFound && response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new HttpException('Spotify API request failed', 502);
    }

    return (await response.json()) as T;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new HttpException('Spotify API credentials are not configured', 503);
    }

    if (
      this.accessToken &&
      Date.now() < this.accessTokenExpiresAt - ACCESS_TOKEN_SAFETY_MARGIN_MS
    ) {
      return this.accessToken;
    }

    const authorization = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
    ).toString('base64');
    const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE_URL}/api/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new HttpException('Spotify token request failed', 502);
    }

    const payload = (await response.json()) as SpotifyTokenResponse;

    if (!payload.access_token || payload.token_type !== 'Bearer') {
      throw new HttpException('Spotify token response is invalid', 502);
    }

    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt = Date.now() + payload.expires_in * 1000;

    return this.accessToken;
  }
}

export interface SpotifyService {
  searchTracks(query: SpotifyTrackSearchQuery): Promise<SpotifyTrackSnapshot[]>;
  getTrackById(trackId: string): Promise<SpotifyTrackSnapshot | null>;
  getTracksByIds(trackIds: string[]): Promise<Map<string, SpotifyTrackSnapshot>>;
  requireTrackById(trackId: string): Promise<SpotifyTrackSnapshot>;
}

export class DefaultSpotifyService implements SpotifyService {
  constructor(private readonly spotifyGateway: SpotifyGateway) {}

  async searchTracks(
    query: SpotifyTrackSearchQuery,
  ): Promise<SpotifyTrackSnapshot[]> {
    return this.spotifyGateway.searchTracks(query.query, query.limit);
  }

  async getTrackById(trackId: string): Promise<SpotifyTrackSnapshot | null> {
    return this.spotifyGateway.getTrackById(trackId);
  }

  async getTracksByIds(
    trackIds: string[],
  ): Promise<Map<string, SpotifyTrackSnapshot>> {
    return this.spotifyGateway.getTracksByIds(trackIds);
  }

  async requireTrackById(trackId: string): Promise<SpotifyTrackSnapshot> {
    const track = await this.spotifyGateway.getTrackById(trackId);

    if (!track) {
      throw new BadRequestException('Spotify track not found');
    }

    return track;
  }
}
