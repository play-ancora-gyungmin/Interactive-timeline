import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createJournalEntry,
  deleteJournalEntry,
  fetchApiHealth,
  fetchJournalDetail,
  fetchJournalPreviews,
  searchSpotifyTracks,
  updateJournalEntry,
} from '../lib/api'
import type { Mood } from '../lib/journal'

const queryKeys = {
  health: ['health'] as const,
  recent: ['journals', 'recent'] as const,
  library: ['journals', 'library'] as const,
  detail: (journalId: string) => ['journals', 'detail', journalId] as const,
  spotifySearch: (query: string) => ['spotify', 'search', query] as const,
}

export function useHealthQuery() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: ({ signal }) => fetchApiHealth(signal),
  })
}

export function useRecentEntriesQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.recent,
    queryFn: ({ signal }) => fetchJournalPreviews(3, undefined, signal),
    enabled,
  })
}

export function useLibraryEntriesQuery(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.library,
    queryFn: ({ pageParam, signal }) =>
      fetchJournalPreviews(10, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pageInfo.nextCursor ?? undefined,
    enabled,
  })
}

export function useJournalDetailQuery(journalId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.detail(journalId ?? 'none'),
    queryFn: ({ signal }) => fetchJournalDetail(journalId!, signal),
    enabled: enabled && Boolean(journalId),
  })
}

export function useSpotifyTrackSearchQuery(query: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.spotifySearch(query),
    queryFn: ({ signal }) => searchSpotifyTracks(query, signal),
    enabled: enabled && query.length >= 2,
  })
}

async function invalidateJournalQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: ['journals'] })
}

export function useCreateJournalEntryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      entryDate: string
      mood: Mood
      note: string
      spotifyTrackId: string
    }) => createJournalEntry(input),
    onSuccess: async () => {
      await invalidateJournalQueries(queryClient)
    },
  })
}

export function useUpdateJournalEntryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      journalId: string
      payload: {
        mood?: Mood
        note?: string
        spotifyTrackId?: string
      }
    }) => updateJournalEntry(input.journalId, input.payload),
    onSuccess: async (_, variables) => {
      await invalidateJournalQueries(queryClient)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.detail(variables.journalId),
      })
    },
  })
}

export function useDeleteJournalEntryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (journalId: string) => deleteJournalEntry(journalId),
    onSuccess: async () => {
      await invalidateJournalQueries(queryClient)
    },
  })
}
