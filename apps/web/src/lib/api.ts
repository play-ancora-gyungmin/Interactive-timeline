const fallbackApiBaseUrl = 'http://localhost:4000/api'

type ApiResponse<T> = {
  success: true
  data: T
}

type ApiErrorResponse = {
  success: false
  message: string
  errors?: Array<{
    path?: string
    message: string
    location?: string
  }>
}

type ApiSpotifyTrack = {
  spotifyTrackId: string
  trackName: string
  artistNames: string[]
  albumName: string
  albumImageUrl: string | null
  spotifyUrl: string
  previewUrl: string | null
}

type ApiJournalListItem = {
  id: string
  entryDate: string
  mood: import('./journal').Mood
  notePreview: string
  track: ApiSpotifyTrack
  createdAt: string
}

type ApiJournalDetail = {
  id: string
  entryDate: string
  mood: import('./journal').Mood
  note: string
  track: ApiSpotifyTrack
  createdAt: string
  updatedAt: string
}

type ApiJournalListResult = {
  items: ApiJournalListItem[]
  pageInfo: {
    nextCursor: string | null
    hasMore: boolean
  }
}

export class ApiClientError extends Error {
  status: number
  errors: ApiErrorResponse['errors']

  constructor(status: number, message: string, errors?: ApiErrorResponse['errors']) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.errors = errors
  }
}

const mapTrackSummary = (
  track: ApiSpotifyTrack,
): import('./journal').TrackSummary => ({
  spotifyTrackId: track.spotifyTrackId,
  name: track.trackName,
  artists: track.artistNames,
  albumName: track.albumName,
  albumImageUrl: track.albumImageUrl,
  spotifyUrl: track.spotifyUrl,
  previewUrl: track.previewUrl,
})

const mapJournalPreview = (
  item: ApiJournalListItem,
): import('./journal').JournalPreview => ({
  id: item.id,
  entryDate: item.entryDate,
  mood: item.mood,
  notePreview: item.notePreview,
  track: mapTrackSummary(item.track),
  createdAt: item.createdAt,
})

const mapJournalDetail = (
  item: ApiJournalDetail,
): import('./journal').JournalEntryDetail => ({
  id: item.id,
  entryDate: item.entryDate,
  mood: item.mood,
  note: item.note,
  track: mapTrackSummary(item.track),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
})

const getApiBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

  if (!apiBaseUrl) {
    return fallbackApiBaseUrl
  }

  return apiBaseUrl.replace(/\/$/, '')
}

const createApiUrl = (path: string) => `${getApiBaseUrl()}${path}`

const apiFetch = async <T>(path: string, init: RequestInit = {}) => {
  const response = await fetch(createApiUrl(path), {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json()) as ApiResponse<T> | ApiErrorResponse

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      payload.success === false ? payload.message : response.statusText,
      payload.success === false ? payload.errors : undefined,
    )
  }

  return (payload as ApiResponse<T>).data
}

type HealthResponse = {
  ok: boolean
}

export async function fetchApiHealth(signal?: AbortSignal) {
  const response = await fetch(`${getApiBaseUrl()}/health`, {
    credentials: 'include',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  const payload = (await response.json()) as HealthResponse

  return payload.ok === true
}

export async function searchSpotifyTracks(query: string, signal?: AbortSignal) {
  const searchParams = new URLSearchParams({
    query,
    limit: '10',
  })

  const data = await apiFetch<ApiSpotifyTrack[]>(
    `/spotify/tracks/search?${searchParams.toString()}`,
    { signal },
  )

  return data.map(mapTrackSummary)
}

export async function fetchJournalPreviews(
  limit: number,
  cursor?: string,
  signal?: AbortSignal,
) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
  })

  if (cursor) {
    searchParams.set('cursor', cursor)
  }

  const data = await apiFetch<ApiJournalListResult>(
    `/journals?${searchParams.toString()}`,
    { signal },
  )

  return {
    items: data.items.map(mapJournalPreview),
    pageInfo: data.pageInfo,
  }
}

export async function fetchJournalDetail(journalId: string, signal?: AbortSignal) {
  const data = await apiFetch<ApiJournalDetail>(`/journals/${journalId}`, { signal })
  return mapJournalDetail(data)
}

export async function createJournalEntry(input: {
  entryDate: string
  mood: import('./journal').Mood
  note: string
  spotifyTrackId: string
}) {
  const data = await apiFetch<ApiJournalDetail>('/journals', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return mapJournalDetail(data)
}

export async function updateJournalEntry(
  journalId: string,
  input: {
    mood?: import('./journal').Mood
    note?: string
    spotifyTrackId?: string
  },
) {
  const data = await apiFetch<ApiJournalDetail>(`/journals/${journalId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

  return mapJournalDetail(data)
}

export async function deleteJournalEntry(journalId: string) {
  await apiFetch<undefined>(`/journals/${journalId}`, {
    method: 'DELETE',
  })
}
