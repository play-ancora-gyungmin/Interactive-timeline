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

    expect(await screen.findByText('아직 표시할 타임라인이 없습니다.')).toBeTruthy()
    expect(screen.queryByText('Sunrise Cassette')).toBeNull()
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
    expect(screen.getByText('집중용 메모 미리보기')).toBeTruthy()
    expect(screen.getByText('실제 기록 피드')).toBeTruthy()
  })

  it('redirects the legacy library route to profile', async () => {
    renderAt('/library')

    await waitFor(() => {
      expect(window.location.pathname).toBe('/profile')
    })

    expect(await screen.findByRole('heading', { name: '프로필' })).toBeTruthy()
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
