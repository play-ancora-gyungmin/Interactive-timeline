import { useDeferredValue, useEffect, useState } from 'react'
import {
  ApiClientError,
  createJournalEntry,
  searchSpotifyTracks,
} from '../lib/api'
import { moodLabels, type Mood, type TrackSummary } from '../lib/journal'

type TodayEntryPageProps = {
  isAuthenticated: boolean
  onBrowseHistory: () => void
  onSignIn: () => void
}

const getTodayEntryDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date())

export function TodayEntryPage({
  isAuthenticated,
  onBrowseHistory,
  onSignIn,
}: TodayEntryPageProps) {
  const [selectedMood, setSelectedMood] = useState<Mood>('focused')
  const [note, setNote] = useState('')
  const [query, setQuery] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<TrackSummary | null>(null)
  const [tracks, setTracks] = useState<TrackSummary[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const deferredQuery = useDeferredValue(query.trim())

  useEffect(() => {
    if (!isAuthenticated || deferredQuery.length < 2) {
      return
    }

    const controller = new AbortController()
    setIsSearching(true)
    setSearchError(null)

    searchSpotifyTracks(deferredQuery, controller.signal)
      .then((results) => {
        setTracks(results)
        setSelectedTrack((current) => {
          if (!current) {
            return results[0] ?? null
          }

          return (
            results.find((track) => track.spotifyTrackId === current.spotifyTrackId) ??
            current
          )
        })
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setSearchError('로그인이 필요합니다.')
          return
        }

        setSearchError('Spotify 검색 결과를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [deferredQuery, isAuthenticated])

  const visibleTracks = isAuthenticated && deferredQuery.length >= 2 ? tracks : []
  const visibleSearchError =
    isAuthenticated && deferredQuery.length >= 2 ? searchError : null

  const isReadyToSave = note.trim().length > 0 && selectedTrack !== null && !isSaving

  const handleSave = async () => {
    if (!isReadyToSave || !selectedTrack) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveMessage(null)

    try {
      const savedEntry = await createJournalEntry({
        entryDate: getTodayEntryDate(),
        mood: selectedMood,
        note: note.trim(),
        spotifyTrackId: selectedTrack.spotifyTrackId,
      })

      setSaveMessage(
        `${savedEntry.entryDate} 기록을 저장했습니다. 히스토리에서 바로 확인할 수 있습니다.`,
      )
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          setSaveError('로그인이 필요합니다.')
        } else if (error.status === 409) {
          setSaveError('오늘 날짜의 기록이 이미 있습니다. 수정 흐름을 먼저 붙여야 합니다.')
        } else {
          setSaveError(error.message)
        }
      } else {
        setSaveError('저장을 완료하지 못했습니다.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="page">
        <section className="panel panel--highlight">
          <span className="eyebrow">Login required</span>
          <h1 className="section-title">Spotify 로그인 후 오늘의 곡을 기록할 수 있습니다</h1>
          <p className="section-copy">
            트랙 검색과 저널 저장은 모두 로그인한 사용자 세션 기준으로 동작합니다.
          </p>
          <div className="cta-row">
            <button type="button" className="button button--primary" onClick={onSignIn}>
              Spotify로 로그인
            </button>
            <button type="button" className="button button--secondary" onClick={onBrowseHistory}>
              히스토리 보기
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <section className="panel panel--highlight">
        <span className="eyebrow">Today entry</span>
        <h1 className="section-title">오늘 남길 한 곡을 Spotify에서 고르세요</h1>
        <p className="section-copy">
          검색 결과는 Spotify Web API에서 불러오고, 저장 시에는 `spotifyTrackId`
          를 기준으로 서버가 곡 정보를 다시 확인합니다.
        </p>
      </section>

      <section className="panel form-grid">
        <div className="field-stack">
          <span className="field-label">Mood</span>
          <div className="mood-grid">
            {Object.entries(moodLabels).map(([mood, label]) => (
              <button
                key={mood}
                type="button"
                className={`mood-chip ${selectedMood === mood ? 'mood-chip--active' : ''}`}
                onClick={() => setSelectedMood(mood as Mood)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-stack">
          <label className="field-label" htmlFor="track-search">
            Spotify track search
          </label>
          <input
            id="track-search"
            className="text-input"
            placeholder="곡명, 아티스트, 앨범명을 입력하세요"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {isSearching ? <div className="helper-text">Spotify 검색 중...</div> : null}
          {visibleSearchError ? (
            <div className="inline-banner inline-banner--error">{visibleSearchError}</div>
          ) : null}
          <div className="track-result-list">
            {visibleTracks.map((track) => (
              <article key={track.spotifyTrackId} className="track-result">
                <div className="track-result__copy">
                  <h3 className="track-title">{track.name}</h3>
                  <div className="track-meta">
                    {track.artists.join(', ')} · {track.albumName}
                  </div>
                </div>
                <div className="track-actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => setSelectedTrack(track)}
                  >
                    선택
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!isSearching &&
          deferredQuery.length >= 2 &&
          visibleTracks.length === 0 &&
          !visibleSearchError ? (
            <div className="empty-state">검색 결과가 없습니다.</div>
          ) : null}
        </div>

        <div className="field-stack">
          <span className="field-label">Selected track</span>
          {selectedTrack ? (
            <div className="track-preview">
              <div className="track-preview__copy">
                <strong>{selectedTrack.name}</strong>
                <span className="track-meta">
                  {selectedTrack.artists.join(', ')} · {selectedTrack.albumName}
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-state">아직 선택한 곡이 없습니다.</div>
          )}
        </div>

        <div className="field-stack">
          <label className="field-label" htmlFor="entry-note">
            Journal note
          </label>
          <textarea
            id="entry-note"
            className="text-area"
            placeholder="오늘 이 곡이 왜 기억에 남는지 짧게 적어보세요."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <div className="cta-row">
          <button
            type="button"
            className="button button--primary"
            disabled={!isReadyToSave}
            onClick={handleSave}
          >
            {isSaving ? '저장 중...' : '오늘 기록 저장'}
          </button>
          <button type="button" className="button button--secondary" onClick={onBrowseHistory}>
            히스토리 보기
          </button>
        </div>

        {saveMessage ? <div className="inline-banner">{saveMessage}</div> : null}
        {saveError ? <div className="inline-banner inline-banner--error">{saveError}</div> : null}
      </section>
    </div>
  )
}
