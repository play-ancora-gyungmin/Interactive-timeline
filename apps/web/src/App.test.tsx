import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { server } from './test/server'

const apiRoute = (path: string) =>
  new RegExp(`${path.replaceAll('/', '\\/')}(?:\\?.*)?$`)

const authState = vi.hoisted(() => ({
  sessionData: null as { user: { id: string; name: string } } | null,
  isPending: false,
  isRefetching: false,
  error: null as Error | null,
  refetch: vi.fn().mockResolvedValue(undefined),
  signInSocial: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: authState.sessionData,
      isPending: authState.isPending,
      isRefetching: authState.isRefetching,
      error: authState.error,
      refetch: authState.refetch,
    }),
    signIn: {
      social: authState.signInSocial,
    },
    signOut: authState.signOut,
  },
}))

const spotifyTrack = {
  spotifyTrackId: 'track-river-lights',
  trackName: 'River Lights',
  artistNames: ['Yuna Park'],
  albumName: 'Small Weather',
  albumImageUrl: null,
  spotifyUrl: 'https://open.spotify.com/',
  previewUrl: null,
}

const liveEntryPreview = {
  id: 'live-1',
  entryDate: '2026-03-23',
  mood: 'focused',
  notePreview: '집중용 메모 미리보기',
  createdAt: '2026-03-23T09:30:00.000Z',
  track: spotifyTrack,
}

function renderAt(pathname: string) {
  window.history.pushState({}, '', pathname)
  return render(<App />)
}

beforeEach(() => {
  authState.sessionData = null
  authState.isPending = false
  authState.isRefetching = false
  authState.error = null
  authState.refetch.mockClear()
  authState.signInSocial.mockClear()
  authState.signOut.mockClear()

  server.use(
    http.get(apiRoute('/api/health'), () =>
      HttpResponse.json({
        ok: true,
        auth: {
          spotifyEnabled: true,
        },
      }),
    ),
  )
})

describe('web app', () => {
  it('renders an empty guest timeline without demo content', async () => {
    renderAt('/')

    expect(
      await screen.findByText('오늘의 음악을 오래 남는 타임라인으로 기록해 보세요.'),
    ).toBeTruthy()
    expect(screen.queryByText('Sunrise Cassette')).toBeNull()
  })

  it('gates the profile tab behind login for guests', async () => {
    renderAt('/profile')

    expect(
      await screen.findByText('내 음악 취향이 쌓이는 프로필을 시작해 보세요'),
    ).toBeTruthy()
    expect(screen.queryByText('작성한 저널 수')).toBeNull()
    expect(screen.queryByText('River Lights')).toBeNull()
  })

  it('disables Spotify login when the server auth provider is unavailable', async () => {
    server.use(
      http.get(apiRoute('/api/health'), () =>
        HttpResponse.json({
          ok: true,
          auth: {
            spotifyEnabled: false,
          },
        }),
      ),
    )

    renderAt('/')

    const buttons = await screen.findAllByRole('button', { name: 'Spotify로 로그인' })

    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }

    expect(screen.getByText(/서버에 Spotify 로그인 설정이 아직 없습니다/)).toBeTruthy()
  })

  it('renders authenticated timeline cards from live data', async () => {
    authState.sessionData = {
      user: {
        id: 'user-1',
        name: '테스트 사용자',
      },
    }

    server.use(
      http.get(apiRoute('/api/journals'), () =>
        HttpResponse.json({
          success: true,
          data: {
            items: [liveEntryPreview],
            pageInfo: {
              hasMore: false,
              nextCursor: null,
            },
          },
        }),
      ),
    )

    renderAt('/')

    expect(await screen.findByText('River Lights')).toBeTruthy()
    expect(screen.getByText('Yuna Park')).toBeTruthy()
    expect(screen.getByText('집중용 메모 미리보기')).toBeTruthy()
    expect(screen.getAllByText('테스트 사용자').length).toBeGreaterThan(1)
  })

  it('creates a journal entry from the floating action button', async () => {
    authState.sessionData = {
      user: {
        id: 'user-1',
        name: '테스트 사용자',
      },
    }

    const createdEntries: Array<typeof liveEntryPreview> = []

    server.use(
      http.get(apiRoute('/api/journals'), () =>
        HttpResponse.json({
          success: true,
          data: {
            items: createdEntries,
            pageInfo: {
              hasMore: false,
              nextCursor: null,
            },
          },
        }),
      ),
      http.get(apiRoute('/api/spotify/tracks/search'), () =>
        HttpResponse.json({
          success: true,
          data: [spotifyTrack],
        }),
      ),
      http.post(apiRoute('/api/journals'), async ({ request }) => {
        const payload = (await request.json()) as {
          entryDate: string
          mood: 'happy' | 'calm' | 'focused' | 'melancholy' | 'chaotic'
          note: string
          spotifyTrackId: string
        }

        createdEntries.splice(0, createdEntries.length, {
          id: 'created-1',
          entryDate: payload.entryDate,
          mood: payload.mood,
          notePreview: payload.note,
          createdAt: '2026-03-24T03:00:00.000Z',
          track: spotifyTrack,
        })

        return HttpResponse.json({
          success: true,
          data: {
            id: 'created-1',
            entryDate: payload.entryDate,
            mood: payload.mood,
            note: payload.note,
            createdAt: '2026-03-24T03:00:00.000Z',
            updatedAt: '2026-03-24T03:00:00.000Z',
            track: spotifyTrack,
          },
        })
      }),
    )

    renderAt('/')

    fireEvent.click(await screen.findByRole('button', { name: '저널 작성' }))

    expect(await screen.findByRole('heading', { name: '새 음악 기록' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('곡 검색'), {
      target: { value: 'River' },
    })

    fireEvent.click(await screen.findByRole('button', { name: /River Lights/ }))

    fireEvent.change(screen.getByLabelText('메모'), {
      target: { value: '오늘의 리듬을 남긴다' },
    })

    fireEvent.click(screen.getByRole('button', { name: '기록 저장' }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
    })

    expect(await screen.findByText('오늘의 리듬을 남긴다')).toBeTruthy()
  })

  it('redirects the legacy library route to profile', async () => {
    renderAt('/library')

    await waitFor(() => {
      expect(window.location.pathname).toBe('/profile')
    })

    expect(
      await screen.findByRole('heading', { name: '내 음악 취향이 쌓이는 프로필을 시작해 보세요' }),
    ).toBeTruthy()
  })

  it('starts Spotify sign-in with an auth return callback that preserves the current location', async () => {
    renderAt('/profile')

    const buttons = await screen.findAllByRole('button', { name: 'Spotify로 로그인' })
    await waitFor(() => {
      expect((buttons[0] as HTMLButtonElement).disabled).toBe(false)
    })

    fireEvent.click(buttons[0])

    expect(authState.signInSocial).toHaveBeenCalledWith({
      provider: 'spotify',
      callbackURL: `${window.location.origin}/auth/return?next=%2Fprofile`,
      errorCallbackURL: `${window.location.origin}/auth/return?next=%2Fprofile`,
    })
  })

  it('returns to the requested screen after auth when a session is already available', async () => {
    authState.sessionData = {
      user: {
        id: 'user-1',
        name: '테스트 사용자',
      },
    }

    renderAt('/auth/return?next=%2Fprofile')

    expect(await screen.findByText('Spotify 인증이 완료되었습니다')).toBeTruthy()
    await waitFor(() => {
      expect(window.location.pathname).toBe('/profile')
    })
  })

  it('shows a failure state when auth return cannot confirm the session', async () => {
    vi.useFakeTimers()

    try {
      renderAt('/auth/return?next=%2Fprofile')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6_000)
      })

      expect(screen.getByText('세션 확인에 실패했습니다')).toBeTruthy()
      expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows an auth error returned from the backend on the frontend callback screen', async () => {
    renderAt('/auth/return?next=%2Fprofile&error=state_mismatch')

    expect(await screen.findByText('세션 확인에 실패했습니다')).toBeTruthy()
    expect(
      screen.getAllByText(
        '로그인 상태가 만료되었거나 브라우저 호스트가 바뀌었습니다. 로그인 버튼부터 다시 시작해 주세요.',
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeTruthy()
  })
})
