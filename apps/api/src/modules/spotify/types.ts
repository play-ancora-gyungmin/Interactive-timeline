export interface SpotifyTrackSnapshot {
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  albumImageUrl: string | null;
  spotifyUrl: string;
  previewUrl: string | null;
}

export interface SpotifyTrackSearchQuery {
  query: string;
  limit: number;
}
