export const JOURNAL_MOODS = [
  'happy',
  'calm',
  'focused',
  'melancholy',
  'chaotic',
] as const;

export type JournalMood = (typeof JOURNAL_MOODS)[number];

export interface JournalTrackInput {
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  albumImageUrl?: string | null;
  spotifyUrl: string;
  previewUrl?: string | null;
}

export interface CreateJournalInput {
  entryDate: string;
  mood: JournalMood;
  note: string;
  track: JournalTrackInput;
}

export interface UpdateJournalInput {
  entryDate?: string;
  mood?: JournalMood;
  note?: string;
  track?: JournalTrackInput;
}

export interface ListJournalsQuery {
  limit: number;
  cursor?: string;
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
  track: JournalTrackInput;
  createdAt: string;
  updatedAt: string;
}

export interface JournalListItem {
  id: string;
  entryDate: string;
  mood: string;
  notePreview: string;
  trackName: string;
  artistNames: string[];
  albumImageUrl: string | null;
  spotifyUrl: string;
}

export interface JournalListResult {
  items: JournalListItem[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}
