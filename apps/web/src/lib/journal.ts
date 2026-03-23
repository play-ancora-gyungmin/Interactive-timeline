export type Mood = 'happy' | 'calm' | 'focused' | 'melancholy' | 'chaotic'

export type EntrySource = 'demo' | 'live'

export type TrackSummary = {
  spotifyTrackId: string
  name: string
  artists: string[]
  albumName: string
  albumImageUrl: string | null
  spotifyUrl: string
  previewUrl: string | null
}

export type JournalPreview = {
  id: string
  entryDate: string
  mood: Mood
  notePreview: string
  track: TrackSummary
  createdAt: string
}

export type JournalEntryDetail = {
  id: string
  entryDate: string
  mood: Mood
  note: string
  track: TrackSummary
  createdAt: string
  updatedAt: string
}

export type JournalCardModel = {
  id: string
  authorName: string | null
  entryDate: string
  mood: Mood
  notePreview: string
  note: string | null
  track: TrackSummary
  createdAt: string
  source: EntrySource
}

const NOTE_PREVIEW_MAX_LENGTH = 120

export const toJournalPreview = (entry: JournalEntryDetail): JournalPreview => ({
  id: entry.id,
  entryDate: entry.entryDate,
  mood: entry.mood,
  notePreview: entry.note.slice(0, NOTE_PREVIEW_MAX_LENGTH),
  track: entry.track,
  createdAt: entry.createdAt,
})

export const toJournalCardModel = (
  entry: JournalPreview | JournalEntryDetail,
  options: {
    source?: EntrySource
    authorName?: string | null
  } = {},
): JournalCardModel => ({
  id: entry.id,
  authorName: options.authorName ?? null,
  entryDate: entry.entryDate,
  mood: entry.mood,
  notePreview: 'notePreview' in entry ? entry.notePreview : entry.note.slice(0, NOTE_PREVIEW_MAX_LENGTH),
  note: 'note' in entry ? entry.note : null,
  track: entry.track,
  createdAt: entry.createdAt,
  source: options.source ?? 'live',
})

export const moodLabels: Record<Mood, string> = {
  happy: '벅차는 하루',
  calm: '조용한 호흡',
  focused: '집중의 리듬',
  melancholy: '느린 여운',
  chaotic: '어지러운 박동',
}
