import { fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { server } from './test/server'

const authState = vi.hoisted(() => ({
  sessionData: null as { user: { id: string; name: string } } | null,
  isPending: false,
  signInSocial: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: authState.sessionData,
      isPending: authState.isPending,
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

const liveEntryDetail = {
  id: 'live-1',
  entryDate: '2026-03-23',
  mood: 'focused',
  note: '집중용 전체 메모',
  createdAt: '2026-03-23T09:30:00.000Z',
  updatedAt: '2026-03-23T09:30:00.000Z',
  track: spotifyTrack,
}

function renderAt(pathname: string) {
  window.history.pushState({}, '', pathname)
  return render(<App />)
}

beforeEach(() => {
  authState.sessionData = null
  authState.isPending = false
  authState.signInSocial.mockClear()
  authState.signOut.mockClear()

  server.use(
    http.get('http://localhost:4000/api/health', () =>
      HttpResponse.json({ ok: true }),
    ),
  )
})

describe('web app', () => {
  it('renders guest overview with demo content', async () => {
    renderAt('/')

    expect((await screen.findAllByText('게스트 모드')).length).toBeGreaterThan(0)
    expect(screen.getByText('로그인 없이 둘러보는 샘플 기록')).toBeTruthy()
    expect(screen.getByText('Sunrise Cassette')).toBeTruthy()
  })

  it('renders guest library as read-only sample feed', async () => {
    renderAt('/library')

    const openButtons = await screen.findAllByRole('button', { name: '열기' })
    fireEvent.click(openButtons[0])

    expect(
      (
        await screen.findAllByText(
          '아침 출근길에 집중이 잘 안 잡혀서 리듬이 선명한 곡을 골랐다. 첫 후렴이 시작될 때 하루의 속도가 정리되는 느낌이 들었다.',
        )
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull()
  })

  it('allows authenticated users to search and save a journal entry', async () => {
    authState.sessionData = {
      user: {
        id: 'user-1',
        name: '테스트 사용자',
      },
    }

    server.use(
      http.get('http://localhost:4000/api/spotify/tracks/search', ({ request }) => {
        const url = new URL(request.url)
        const query = url.searchParams.get('query')

        if (query === 'river') {
          return HttpResponse.json({ success: true, data: [spotifyTrack] })
        }

        return HttpResponse.json({ success: true, data: [] })
      }),
      http.post('http://localhost:4000/api/journals', async () =>
        HttpResponse.json({ success: true, data: liveEntryDetail }),
      ),
    )

    renderAt('/capture')

    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'river' },
    })

    expect((await screen.findAllByText('River Lights')).length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Journal note'), {
      target: { value: '집중 메모를 저장합니다.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '기록 저장' }))

    expect(await screen.findByText(/기록을 저장했습니다/)).toBeTruthy()
  })

  it('allows authenticated users to edit a journal entry from library detail', async () => {
    authState.sessionData = {
      user: {
        id: 'user-1',
        name: '테스트 사용자',
      },
    }

    const updatedNote = '수정된 메모'

    server.use(
      http.get('http://localhost:4000/api/journals', () =>
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
      http.get('http://localhost:4000/api/journals/live-1', () =>
        HttpResponse.json({ success: true, data: liveEntryDetail }),
      ),
      http.patch('http://localhost:4000/api/journals/live-1', async () =>
        HttpResponse.json({
          success: true,
          data: {
            ...liveEntryDetail,
            note: updatedNote,
          },
        }),
      ),
    )

    renderAt('/library?entry=live-1&mode=edit')

    const textarea = await screen.findByLabelText('Journal note')
    fireEvent.change(textarea, { target: { value: updatedNote } })
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))

    expect(await screen.findByText(/기록을 수정했습니다/)).toBeTruthy()
  })

  it('allows authenticated users to delete a journal entry with confirmation', async () => {
    authState.sessionData = {
      user: {
        id: 'user-1',
        name: '테스트 사용자',
      },
    }

    let items = [liveEntryPreview]

    server.use(
      http.get('http://localhost:4000/api/journals', () =>
        HttpResponse.json({
          success: true,
          data: {
            items,
            pageInfo: {
              hasMore: false,
              nextCursor: null,
            },
          },
        }),
      ),
      http.get('http://localhost:4000/api/journals/live-1', () =>
        HttpResponse.json({ success: true, data: liveEntryDetail }),
      ),
      http.delete('http://localhost:4000/api/journals/live-1', () => {
        items = []
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderAt('/library?entry=live-1')

    fireEvent.click(await screen.findByRole('button', { name: '삭제' }))
    fireEvent.click(await screen.findByRole('button', { name: '삭제하기' }))

    expect(await screen.findByText('기록을 삭제했습니다.')).toBeTruthy()
  })
})
