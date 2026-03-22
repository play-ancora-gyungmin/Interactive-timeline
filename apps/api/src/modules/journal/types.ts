import type { SpotifyTrackSnapshot } from '../spotify/types.js';

export const JOURNAL_MOODS = [
  'happy',
  'calm',
  'focused',
  'melancholy',
  'chaotic',
] as const;

export type JournalMood = (typeof JOURNAL_MOODS)[number];

export interface CreateJournalInput {
  entryDate: string;
  mood: JournalMood;
  note: string;
  spotifyTrackId: string;
}

export interface UpdateJournalInput {
  entryDate?: string;
  mood?: JournalMood;
  note?: string;
  spotifyTrackId?: string;
}

export interface ListJournalsQuery {
  limit: number;
  cursor?: string;
}

export interface JournalListCursor {
  createdAt: Date;
  id: string;
}

export interface JournalEntity {
  id: string;
  userId: string;
  entryDate: Date;
  mood: string;
  note: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  albumImageUrl: string | null;
  spotifyUrl: string;
  previewUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalDetail {
  id: string;
  entryDate: string;
  mood: string;
  note: string;
  track: SpotifyTrackSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface JournalListItem {
  id: string;
  entryDate: string;
  mood: string;
  notePreview: string;
  track: SpotifyTrackSnapshot;
  createdAt: string;
}

export interface JournalListResult {
  items: JournalListItem[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
