import {
  toJournalCardModel,
  toJournalPreview,
  type JournalCardModel,
  type JournalEntryDetail,
} from './journal'

export const demoJournalDetails: JournalEntryDetail[] = [
  {
    id: 'demo-sunrise-cassette',
    entryDate: '2026-03-23',
    mood: 'focused',
    note:
      '아침 출근길에 집중이 잘 안 잡혀서 리듬이 선명한 곡을 골랐다. 첫 후렴이 시작될 때 하루의 속도가 정리되는 느낌이 들었다.',
    track: {
      spotifyTrackId: 'demo-track-001',
      name: 'Sunrise Cassette',
      artists: ['Lunar Frame'],
      albumName: 'Soft Transit',
      albumImageUrl: null,
      spotifyUrl: 'https://open.spotify.com/',
      previewUrl: null,
    },
    createdAt: '2026-03-23T08:10:00.000Z',
    updatedAt: '2026-03-23T08:10:00.000Z',
  },
  {
    id: 'demo-river-lights',
    entryDate: '2026-03-21',
    mood: 'calm',
    note:
      '저녁 산책을 마치고 집에 돌아와서 들은 곡. 조용히 번지는 신스가 하루를 한 장의 필름처럼 정리해 줬다.',
    track: {
      spotifyTrackId: 'demo-track-002',
      name: 'River Lights',
      artists: ['Yuna Park'],
      albumName: 'Small Weather',
      albumImageUrl: null,
      spotifyUrl: 'https://open.spotify.com/',
      previewUrl: null,
    },
    createdAt: '2026-03-21T12:40:00.000Z',
    updatedAt: '2026-03-21T12:40:00.000Z',
  },
  {
    id: 'demo-after-image',
    entryDate: '2026-03-18',
    mood: 'melancholy',
    note:
      '늦은 밤 작업을 끝내고 남은 여운이 길었다. 보컬이 전면에 나오지 않는데도 메모를 오래 끌어내는 곡이었다.',
    track: {
      spotifyTrackId: 'demo-track-003',
      name: 'After Image',
      artists: ['Seoul Static'],
      albumName: 'Night Draft',
      albumImageUrl: null,
      spotifyUrl: 'https://open.spotify.com/',
      previewUrl: null,
    },
    createdAt: '2026-03-18T15:25:00.000Z',
    updatedAt: '2026-03-18T15:25:00.000Z',
  },
]

export const demoJournalPreviews = demoJournalDetails.map(toJournalPreview)

export const demoJournalCards: JournalCardModel[] = demoJournalDetails.map((entry) =>
  toJournalCardModel(entry, 'demo'),
)

export const getDemoJournalDetail = (journalId: string) =>
  demoJournalDetails.find((entry) => entry.id === journalId) ?? null
