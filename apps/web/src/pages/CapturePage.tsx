import { useDeferredValue, useMemo, useState } from 'react'
import { useAppLayoutContext } from '../app/layout-context'
import { routePaths } from '../app/routes'
import { TrackArtwork } from '../components/journal/TrackArtwork'
import { ActionButton } from '../components/ui/ActionButton'
import { Notice } from '../components/ui/Notice'
import { Surface } from '../components/ui/Surface'
import {
  useCreateJournalEntryMutation,
  useSpotifyTrackSearchQuery,
} from '../hooks/useJournalQueries'
import { ApiClientError } from '../lib/api'
import { moodLabels, type Mood, type TrackSummary } from '../lib/journal'
import styles from './CapturePage.module.css'

const DEFAULT_MOOD: Mood = 'focused'

const getTodayEntryDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date())

function getCaptureErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return '로그인이 필요합니다.'
    }

    return error.message
  }

  return fallbackMessage
}

export function CapturePage() {
  const { appMode, onSignIn } = useAppLayoutContext()
  const createJournalMutation = useCreateJournalEntryMutation()
  const [selectedMood, setSelectedMood] = useState<Mood>(DEFAULT_MOOD)
  const [note, setNote] = useState('')
  const [query, setQuery] = useState('')
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const trimmedQuery = query.trim()
  const deferredQuery = useDeferredValue(trimmedQuery)
  const searchQuery = useSpotifyTrackSearchQuery(
    deferredQuery,
    appMode === 'authenticated',
  )

  const searchResults = useMemo(
    () =>
      appMode === 'authenticated' && deferredQuery.length >= 2 ? searchQuery.data ?? [] : [],
    [appMode, deferredQuery.length, searchQuery.data],
  )

  const selectedTrack: TrackSummary | null =
    searchResults.find((track) => track.spotifyTrackId === selectedTrackId) ??
    searchResults[0] ??
    null

  const isReadyToSave =
    appMode === 'authenticated' &&
    note.trim().length > 0 &&
    selectedTrack !== null &&
    !createJournalMutation.isPending

  const handleSave = async () => {
    if (!isReadyToSave || !selectedTrack) {
      return
    }

    try {
      const entryDate = getTodayEntryDate()

      await createJournalMutation.mutateAsync({
        entryDate,
        mood: selectedMood,
        note: note.trim(),
        spotifyTrackId: selectedTrack.spotifyTrackId,
      })

      setSaveMessage(`${entryDate} 기록을 저장했습니다. 라이브러리에서 바로 이어서 확인할 수 있습니다.`)
      setNote('')
      setQuery('')
      setSelectedTrackId(null)
    } catch {
      setSaveMessage(null)
    }
  }

  const searchError =
    searchQuery.error instanceof ApiClientError || searchQuery.error
      ? getCaptureErrorMessage(searchQuery.error, 'Spotify 검색 결과를 불러오지 못했습니다.')
      : null

  const saveError =
    createJournalMutation.error instanceof ApiClientError || createJournalMutation.error
      ? getCaptureErrorMessage(createJournalMutation.error, '기록을 저장하지 못했습니다.')
      : null

  if (appMode === 'guest') {
    return (
      <div className={styles.page}>
        <Surface className={styles.guestHero} tone="hero">
          <span className={styles.sectionEyebrow}>로그인 필요</span>
          <h1 className={styles.sectionTitle}>게스트 모드에서는 기록 작성 대신 샘플 탐색만 가능합니다</h1>
          <p className={styles.sectionCopy}>
            실제 Spotify 검색과 저장은 인증 사용자 세션 기준으로만 동작합니다. 먼저 홈이나
            라이브러리에서 데모 흐름을 둘러보고, 준비되면 Spotify 로그인으로 전환하세요.
          </p>
          <div className={styles.ctaRow}>
            <ActionButton variant="primary" onClick={onSignIn}>
              Spotify로 로그인
            </ActionButton>
            <ActionButton to={routePaths.library}>샘플 라이브러리 보기</ActionButton>
          </div>
        </Surface>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Surface className={styles.hero} tone="hero">
        <span className={styles.sectionEyebrow}>기록하기</span>
        <h1 className={styles.sectionTitle}>감정, 곡, 메모를 한 흐름으로 이어서 저장합니다</h1>
        <p className={styles.sectionCopy}>
          검색 결과에서 곡을 고르고, 오늘의 감정과 짧은 메모를 붙여 하나의 기록으로 남깁니다.
        </p>
      </Surface>

      <div className={styles.grid}>
        <Surface className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>1. 분위기와 메모</span>
              <h2 className={styles.panelTitle}>오늘의 톤 정리</h2>
            </div>
            <span className={styles.dateBadge}>{getTodayEntryDate()}</span>
          </div>

          <div className={styles.fieldStack}>
            <span className={styles.label}>Mood</span>
            <div className={styles.moodGrid}>
              {Object.entries(moodLabels).map(([mood, label]) => (
                <button
                  key={mood}
                  className={`${styles.moodButton} ${
                    selectedMood === mood ? styles['moodButton--active'] : ''
                  }`}
                  onClick={() => setSelectedMood(mood as Mood)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldStack}>
            <label className={styles.label} htmlFor="entry-note">
              Journal note
            </label>
            <textarea
              className={styles.textarea}
              id="entry-note"
              onChange={(event) => setNote(event.target.value)}
              placeholder="이 곡이 오늘 어떤 장면과 연결되는지 적어 보세요."
              value={note}
            />
          </div>

          <div className={styles.ctaRow}>
            <ActionButton
              disabled={!isReadyToSave}
              onClick={() => void handleSave()}
              variant="primary"
            >
              {createJournalMutation.isPending ? '저장 중...' : '기록 저장'}
            </ActionButton>
            <ActionButton to={routePaths.library}>라이브러리 보기</ActionButton>
          </div>

          {saveMessage ? <Notice tone="success">{saveMessage}</Notice> : null}
          {saveError ? <Notice tone="error">{saveError}</Notice> : null}
        </Surface>

        <Surface className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>2. 곡 고르기</span>
              <h2 className={styles.panelTitle}>Spotify 트랙 검색</h2>
            </div>
          </div>

          <div className={styles.fieldStack}>
            <label className={styles.label} htmlFor="track-search">
              Search
            </label>
            <input
              className={styles.input}
              id="track-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="곡명, 아티스트, 앨범명으로 검색하세요"
              value={query}
            />
            <span className={styles.helper}>
              두 글자 이상 입력하면 결과를 불러오고, 첫 결과를 기본 선택합니다.
            </span>
          </div>

          {searchQuery.isFetching ? <Notice tone="subtle">Spotify 검색 중...</Notice> : null}
          {searchError ? <Notice tone="error">{searchError}</Notice> : null}

          {selectedTrack ? (
            <div className={styles.selectedTrack}>
              <TrackArtwork albumImageUrl={selectedTrack.albumImageUrl} title={selectedTrack.name} />
              <div className={styles.selectedTrackCopy}>
                <span className={styles.panelEyebrow}>선택된 곡</span>
                <strong>{selectedTrack.name}</strong>
                <span>{selectedTrack.artists.join(', ')}</span>
                <span>{selectedTrack.albumName}</span>
                <div className={styles.trackActions}>
                  <ActionButton href={selectedTrack.spotifyUrl} variant="ghost">
                    Spotify 열기
                  </ActionButton>
                  {selectedTrack.previewUrl ? (
                    <audio controls className={styles.audio} src={selectedTrack.previewUrl}>
                      미리듣기를 지원하지 않는 브라우저입니다.
                    </audio>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <Notice tone="subtle">아직 선택된 곡이 없습니다.</Notice>
          )}

          <div className={styles.resultList}>
            {searchResults.map((track) => (
              <article className={styles.resultCard} key={track.spotifyTrackId}>
                <TrackArtwork albumImageUrl={track.albumImageUrl} compact title={track.name} />
                <div className={styles.resultCopy}>
                  <strong>{track.name}</strong>
                  <span>{track.artists.join(', ')}</span>
                  <span>{track.albumName}</span>
                </div>
                <div className={styles.resultActions}>
                  <ActionButton
                    onClick={() => setSelectedTrackId(track.spotifyTrackId)}
                    variant="secondary"
                  >
                    선택
                  </ActionButton>
                  <ActionButton href={track.spotifyUrl} variant="ghost">
                    Spotify
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>

          {!searchQuery.isFetching &&
          deferredQuery.length >= 2 &&
          searchResults.length === 0 &&
          !searchError ? <Notice tone="subtle">검색 결과가 없습니다.</Notice> : null}
        </Surface>
      </div>
    </div>
  )
}
