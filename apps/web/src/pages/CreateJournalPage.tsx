import { startTransition, useDeferredValue, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppLayoutContext } from '../app/layout-context'
import { TrackArtwork } from '../components/journal/TrackArtwork'
import { ActionButton } from '../components/ui/ActionButton'
import { Notice } from '../components/ui/Notice'
import {
  useCreateJournalEntryMutation,
  useSpotifyTrackSearchQuery,
} from '../hooks/useJournalQueries'
import { ApiClientError } from '../lib/api'
import { moodLabels, type Mood, type TrackSummary } from '../lib/journal'
import { routePaths } from '../app/routes'
import styles from './CreateJournalPage.module.css'

const moodOptions = Object.entries(moodLabels) as Array<[Mood, string]>

const getTodayDateValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getCreateErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError) {
    return error.message
  }

  return '기록 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'
}

export function CreateJournalPage() {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    spotifyAuthAvailability,
    onSignIn,
  } = useAppLayoutContext()
  const [entryDate, setEntryDate] = useState(getTodayDateValue)
  const [mood, setMood] = useState<Mood>('calm')
  const [note, setNote] = useState('')
  const [trackQuery, setTrackQuery] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<TrackSummary | null>(null)
  const deferredTrackQuery = useDeferredValue(trackQuery.trim())
  const spotifySearchQuery = useSpotifyTrackSearchQuery(
    deferredTrackQuery,
    isAuthenticated,
  )
  const createEntryMutation = useCreateJournalEntryMutation()

  const searchResults = spotifySearchQuery.data ?? []
  const createErrorMessage = createEntryMutation.error
    ? getCreateErrorMessage(createEntryMutation.error)
    : null
  const canSubmit = Boolean(selectedTrack) && note.trim().length > 0
  const selectedTrackArtists = selectedTrack?.artists.join(', ') ?? ''

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedTrack || !note.trim()) {
      return
    }

    try {
      await createEntryMutation.mutateAsync({
        entryDate,
        mood,
        note: note.trim(),
        spotifyTrackId: selectedTrack.spotifyTrackId,
      })
    } catch {
      return
    }

    startTransition(() => {
      navigate(routePaths.overview)
    })
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <section className={styles.sheet}>
          <span className={styles.eyebrow}>New Journal</span>
          <h1 className={styles.title}>로그인 후 새 기록을 만들 수 있습니다.</h1>
          <p className={styles.copy}>
            곡 검색과 저널 저장은 Spotify 세션이 있어야 동작합니다. 로그인 후 바로 이 화면으로
            돌아와서 기록을 이어서 작성할 수 있습니다.
          </p>

          {spotifyAuthAvailability === 'disabled' ? (
            <Notice tone="subtle">
              서버에 Spotify 로그인 설정이 없어 현재는 새 기록을 만들 수 없습니다.
            </Notice>
          ) : null}

          {spotifyAuthAvailability === 'unknown' ? (
            <Notice tone="error">
              로그인 구성을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.
            </Notice>
          ) : null}

          <div className={styles.actions}>
            <ActionButton
              disabled={spotifyAuthAvailability !== 'enabled'}
              onClick={onSignIn}
              variant="primary"
            >
              {spotifyAuthAvailability === 'checking'
                ? 'Spotify 상태 확인 중'
                : 'Spotify로 로그인'}
            </ActionButton>
            <ActionButton to={routePaths.overview} variant="secondary">
              타임라인으로 돌아가기
            </ActionButton>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.sheet}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>New Journal</span>
            <h1 className={styles.title}>새 음악 기록</h1>
          </div>
          <ActionButton to={routePaths.overview} variant="ghost">
            취소
          </ActionButton>
        </div>

        <p className={styles.copy}>
          오늘 들은 곡과 감정, 짧은 메모를 남기면 메인 타임라인에 바로 반영됩니다.
        </p>

        {createErrorMessage ? <Notice tone="error">{createErrorMessage}</Notice> : null}

        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <label className={styles.field}>
            <span className={styles.label}>날짜</span>
            <input
              aria-label="날짜"
              className={styles.input}
              max={getTodayDateValue()}
              onChange={(event) => setEntryDate(event.target.value)}
              type="date"
              value={entryDate}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.label}>오늘의 무드</span>
            <div className={styles.moodGrid}>
              {moodOptions.map(([value, label]) => (
                <button
                  className={[
                    styles.moodChip,
                    mood === value ? styles['moodChip--active'] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={value}
                  onClick={() => setMood(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>곡 검색</span>
            <input
              aria-label="곡 검색"
              className={styles.input}
              onChange={(event) => setTrackQuery(event.target.value)}
              placeholder="곡명이나 아티스트를 입력하세요"
              type="search"
              value={trackQuery}
            />
            <span className={styles.helper}>
              두 글자 이상 입력하면 Spotify에서 트랙을 검색합니다.
            </span>
          </label>

          {selectedTrack ? (
            <div className={styles.selectedTrack}>
              <TrackArtwork
                albumImageUrl={selectedTrack.albumImageUrl}
                compact
                title={selectedTrack.name}
              />
              <div className={styles.selectedTrackCopy}>
                <strong>{selectedTrack.name}</strong>
                <span>{selectedTrackArtists}</span>
                <small>{selectedTrack.albumName}</small>
              </div>
              <button
                className={styles.clearTrackButton}
                onClick={() => setSelectedTrack(null)}
                type="button"
              >
                선택 해제
              </button>
            </div>
          ) : null}

          {!selectedTrack && deferredTrackQuery.length >= 2 ? (
            <div className={styles.searchResults}>
              {spotifySearchQuery.isPending ? (
                <p className={styles.searchState}>트랙을 찾는 중입니다.</p>
              ) : null}

              {spotifySearchQuery.isError ? (
                <Notice tone="error">
                  곡 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.
                </Notice>
              ) : null}

              {!spotifySearchQuery.isPending && !spotifySearchQuery.isError && searchResults.length === 0 ? (
                <p className={styles.searchState}>검색 결과가 없습니다.</p>
              ) : null}

              {searchResults.map((track) => (
                <button
                  className={styles.trackOption}
                  key={track.spotifyTrackId}
                  onClick={() => setSelectedTrack(track)}
                  type="button"
                >
                  <TrackArtwork albumImageUrl={track.albumImageUrl} compact title={track.name} />
                  <div className={styles.trackOptionCopy}>
                    <strong>{track.name}</strong>
                    <span>{track.artists.join(', ')}</span>
                    <small>{track.albumName}</small>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          <label className={styles.field}>
            <span className={styles.label}>메모</span>
            <textarea
              aria-label="메모"
              className={styles.textarea}
              onChange={(event) => setNote(event.target.value)}
              placeholder="오늘 음악이 남긴 장면이나 감정을 적어보세요"
              rows={6}
              value={note}
            />
          </label>

          <div className={styles.actions}>
            <ActionButton
              disabled={!canSubmit || createEntryMutation.isPending}
              type="submit"
              variant="primary"
            >
              {createEntryMutation.isPending ? '저장 중...' : '기록 저장'}
            </ActionButton>
          </div>
        </form>
      </section>
    </div>
  )
}
