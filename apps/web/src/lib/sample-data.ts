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

export type JournalEntry = {
  id: string
  entryDate: string
  mood: Mood
  note: string
  track: TrackSummary
}

export const moodLabels: Record<Mood, string> = {
  happy: '벅차는 하루',
  calm: '조용한 호흡',
  focused: '집중의 리듬',
  melancholy: '느린 여운',
  chaotic: '어지러운 박동',
}

export const sampleEntries: JournalEntry[] = [
  {
    id: 'entry-1',
    entryDate: '2026-03-20',
    mood: 'focused',
    note: '일이 길어졌지만 후렴이 집중을 붙잡아 줬다.',
    track: {
      spotifyTrackId: 'track-1',
      name: 'Midnight Engine',
      artists: ['Nova Habit'],
      albumName: 'Blue Commute',
      albumImageUrl: null,
      spotifyUrl: 'https://open.spotify.com',
      previewUrl: null,
    },
  },
  {
    id: 'entry-2',
    entryDate: '2026-03-19',
    mood: 'calm',
    note: '밤산책 전에 들었더니 템포가 마음을 정리해줬다.',
    track: {
      spotifyTrackId: 'track-2',
      name: 'Soft Exit',
      artists: ['Paper Moon Club'],
      albumName: 'Neon Balcony',
      albumImageUrl: null,
      spotifyUrl: 'https://open.spotify.com',
      previewUrl: null,
    },
  },
  {
    id: 'entry-3',
    entryDate: '2026-03-18',
    mood: 'happy',
    note: '오전 회의 전에 틀었더니 괜히 하루가 가벼워졌다.',
    track: {
      spotifyTrackId: 'track-3',
      name: 'Sunlit Steps',
      artists: ['Harbor Kids'],
      albumName: 'Morning Relay',
      albumImageUrl: null,
      spotifyUrl: 'https://open.spotify.com',
      previewUrl: null,
    },
  },
  {
    id: 'entry-4',
    entryDate: '2026-03-15',
    mood: 'melancholy',
    note: '늦은 밤 버스 창문에 비친 풍경이랑 묘하게 잘 맞았다.',
    track: {
      spotifyTrackId: 'track-4',
      name: 'Rain Between Signals',
      artists: ['Static Bloom'],
      albumName: 'Transit Hearts',
      albumImageUrl: null,
      spotifyUrl: 'https://open.spotify.com',
      previewUrl: null,
    },
  },
]
