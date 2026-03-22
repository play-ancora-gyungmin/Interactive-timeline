export type Mood = 'happy' | 'calm' | 'focused' | 'melancholy' | 'chaotic'

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

export const moodLabels: Record<Mood, string> = {
  happy: '벅차는 하루',
  calm: '조용한 호흡',
  focused: '집중의 리듬',
  melancholy: '느린 여운',
  chaotic: '어지러운 박동',
}
