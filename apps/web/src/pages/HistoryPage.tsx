import { useEffect, useState } from 'react'
import {
  ApiClientError,
  deleteJournalEntry,
  fetchJournalDetail,
  fetchJournalPreviews,
  searchSpotifyTracks,
  updateJournalEntry,
} from '../lib/api'
import {
  moodLabels,
  toJournalPreview,
  type JournalEntryDetail,
  type JournalPreview,
  type Mood,
  type TrackSummary,
} from '../lib/journal'

type HistoryPageProps = {
  isAuthenticated: boolean
  onSignIn: () => void
}

const DEFAULT_MOOD: Mood = 'focused'
const formatPostedAt = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export function HistoryPage({ isAuthenticated, onSignIn }: HistoryPageProps) {
  const [entries, setEntries] = useState<JournalPreview[]>([])
  const [detailsById, setDetailsById] = useState<Record<string, JournalEntryDetail>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMood, setEditMood] = useState<Mood>(DEFAULT_MOOD)
  const [editNote, setEditNote] = useState('')
  const [editQuery, setEditQuery] = useState('')
  const [editSelectedTrack, setEditSelectedTrack] = useState<TrackSummary | null>(null)
  const [editTracks, setEditTracks] = useState<TrackSummary[]>([])
  const [isSearchingTracks, setIsSearchingTracks] = useState(false)
  const [editSearchError, setEditSearchError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const controller = new AbortController()

    setIsLoading(true)

    fetchJournalPreviews(10, undefined, controller.signal)
      .then((data) => {
        setEntries(data.items)
        setExpandedId(data.items[0]?.id ?? null)
        setNextCursor(data.pageInfo.nextCursor)
        setHasMore(data.pageInfo.hasMore)
        setErrorMessage(null)
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setErrorMessage('로그인이 필요합니다.')
          return
        }

        setErrorMessage('히스토리를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!expandedId || detailsById[expandedId] || !isAuthenticated) {
      return
    }

    const controller = new AbortController()

    fetchJournalDetail(expandedId, controller.signal)
      .then((detail) => {
        setDetailsById((current) => ({
          ...current,
          [detail.id]: detail,
        }))
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setErrorMessage('엔트리 상세를 불러오지 못했습니다.')
        }
      })

    return () => {
      controller.abort()
    }
  }, [detailsById, expandedId, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !editingId || editQuery.trim().length < 2) {
      setEditTracks([])
      setEditSearchError(null)
      setIsSearchingTracks(false)
      return
    }

    const controller = new AbortController()

    setIsSearchingTracks(true)
    setEditSearchError(null)

    searchSpotifyTracks(editQuery.trim(), controller.signal)
      .then((results) => {
        setEditTracks(results)
        setEditSelectedTrack((current) => {
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
          setEditSearchError('로그인이 필요합니다.')
          return
        }

        setEditSearchError('Spotify 검색 결과를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearchingTracks(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [editQuery, editingId, isAuthenticated])

  const loadDetail = async (journalId: string) => {
    const existing = detailsById[journalId]

    if (existing) {
      return existing
    }

    const detail = await fetchJournalDetail(journalId)

    setDetailsById((current) => ({
      ...current,
      [detail.id]: detail,
    }))

    return detail
  }

  const handleLoadMore = async () => {
    if (!nextCursor || isLoading) {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const data = await fetchJournalPreviews(10, nextCursor)
      setEntries((current) => [...current, ...data.items])
      setNextCursor(data.pageInfo.nextCursor)
      setHasMore(data.pageInfo.hasMore)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setErrorMessage('로그인이 필요합니다.')
      } else {
        setErrorMessage('추가 히스토리를 불러오지 못했습니다.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartEditing = async (journalId: string) => {
    setActionMessage(null)
    setErrorMessage(null)

    try {
      const detail = await loadDetail(journalId)
      setExpandedId(journalId)
      setEditingId(journalId)
      setEditMood(detail.mood)
      setEditNote(detail.note)
      setEditSelectedTrack(detail.track)
      setEditQuery('')
      setEditTracks([])
      setEditSearchError(null)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setErrorMessage('로그인이 필요합니다.')
      } else {
        setErrorMessage('편집할 엔트리를 불러오지 못했습니다.')
      }
    }
  }

  const handleCancelEditing = () => {
    setEditingId(null)
    setEditMood(DEFAULT_MOOD)
    setEditNote('')
    setEditSelectedTrack(null)
    setEditQuery('')
    setEditTracks([])
    setEditSearchError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editSelectedTrack || editNote.trim().length === 0) {
      return
    }

    setIsSubmittingEdit(true)
    setErrorMessage(null)
    setActionMessage(null)

    try {
      const updated = await updateJournalEntry(editingId, {
        mood: editMood,
        note: editNote.trim(),
        spotifyTrackId: editSelectedTrack.spotifyTrackId,
      })

      setDetailsById((current) => ({
        ...current,
        [updated.id]: updated,
      }))
      setEntries((current) =>
        current.map((entry) => (entry.id === updated.id ? toJournalPreview(updated) : entry)),
      )
      setEditingId(null)
      setActionMessage(`${updated.entryDate} 기록을 수정했습니다.`)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setErrorMessage('로그인이 필요합니다.')
      } else if (error instanceof ApiClientError && error.status === 404) {
        setErrorMessage('수정할 저널을 찾지 못했습니다.')
      } else {
        setErrorMessage('저널을 수정하지 못했습니다.')
      }
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const handleDelete = async (journalId: string) => {
    if (!window.confirm('이 저널을 삭제하시겠습니까?')) {
      return
    }

    setDeletingId(journalId)
    setErrorMessage(null)
    setActionMessage(null)

    try {
      await deleteJournalEntry(journalId)

      const remainingEntries = entries.filter((entry) => entry.id !== journalId)

      setEntries(remainingEntries)
      setDetailsById((current) => {
        const next = { ...current }
        delete next[journalId]
        return next
      })
      setExpandedId((current) => {
        if (current !== journalId) {
          return current
        }

        return remainingEntries[0]?.id ?? null
      })

      if (editingId === journalId) {
        handleCancelEditing()
      }

      setActionMessage('저널을 삭제했습니다.')
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setErrorMessage('로그인이 필요합니다.')
      } else if (error instanceof ApiClientError && error.status === 404) {
        setErrorMessage('삭제할 저널을 찾지 못했습니다.')
      } else {
        setErrorMessage('저널을 삭제하지 못했습니다.')
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="page">
        <section className="panel panel--highlight">
          <span className="eyebrow">History</span>
          <h1 className="section-title">로그인 후 지난 기록을 다시 볼 수 있습니다</h1>
          <p className="section-copy">
            히스토리와 상세 조회는 모두 로그인한 사용자 기준으로만 노출됩니다.
          </p>
          <div className="cta-row">
            <button type="button" className="button button--primary" onClick={onSignIn}>
              Spotify로 로그인
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (errorMessage && entries.length === 0) {
    return <div className="inline-banner inline-banner--error">{errorMessage}</div>
  }

  if (!isLoading && entries.length === 0) {
    return <div className="empty-state">저장된 히스토리가 아직 없습니다.</div>
  }

  return (
    <div className="page">
      <section className="panel panel--highlight">
        <span className="eyebrow">History</span>
        <h1 className="section-title">지난 기록을 Spotify 메타데이터와 함께 다시 보기</h1>
        <p className="section-copy">
          최신 작성 순으로 정렬됩니다. 펼친 카드에서 바로 수정하거나 삭제할 수 있습니다.
        </p>
      </section>

      {actionMessage ? <div className="inline-banner">{actionMessage}</div> : null}
      {errorMessage ? (
        <div className="inline-banner inline-banner--error">{errorMessage}</div>
      ) : null}

      <section className="panel history-list">
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id
          const isEditing = editingId === entry.id
          const detail = detailsById[entry.id]
          const visibleTrack = detail?.track ?? entry.track

          return (
            <article key={entry.id} className="history-card">
              <div className="history-card__header">
                <div>
                  <div className="history-card__meta">
                    {entry.entryDate} · 게시 {formatPostedAt(entry.createdAt)}
                  </div>
                  <h3 className="track-title">{visibleTrack.name}</h3>
                  <div className="track-meta">{visibleTrack.artists.join(', ')}</div>
                </div>
                <div className="track-actions">
                  <span className="mood-badge">{moodLabels[entry.mood]}</span>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    {isExpanded ? '접기' : '펼치기'}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="history-card__details">
                  {isEditing ? (
                    <div className="editor-grid">
                      <div className="field-stack">
                        <span className="field-label">Mood</span>
                        <div className="mood-grid">
                          {Object.entries(moodLabels).map(([mood, label]) => (
                            <button
                              key={mood}
                              type="button"
                              className={`mood-chip ${editMood === mood ? 'mood-chip--active' : ''}`}
                              onClick={() => setEditMood(mood as Mood)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="field-stack">
                        <label className="field-label" htmlFor={`edit-track-search-${entry.id}`}>
                          Spotify track search
                        </label>
                        <input
                          id={`edit-track-search-${entry.id}`}
                          className="text-input"
                          placeholder="다른 곡으로 바꾸려면 검색하세요"
                          value={editQuery}
                          onChange={(event) => setEditQuery(event.target.value)}
                        />
                        {isSearchingTracks ? (
                          <div className="helper-text">Spotify 검색 중...</div>
                        ) : null}
                        {editSearchError ? (
                          <div className="inline-banner inline-banner--error">
                            {editSearchError}
                          </div>
                        ) : null}
                        <div className="track-result-list">
                          {editTracks.map((track) => (
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
                                  onClick={() => setEditSelectedTrack(track)}
                                >
                                  선택
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>

                      <div className="field-stack">
                        <span className="field-label">Selected track</span>
                        {editSelectedTrack ? (
                          <div className="track-preview">
                            <div className="track-preview__copy">
                              <strong>{editSelectedTrack.name}</strong>
                              <span className="track-meta">
                                {editSelectedTrack.artists.join(', ')} · {editSelectedTrack.albumName}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="empty-state">선택한 곡이 없습니다.</div>
                        )}
                      </div>

                      <div className="field-stack">
                        <label className="field-label" htmlFor={`edit-note-${entry.id}`}>
                          Journal note
                        </label>
                        <textarea
                          id={`edit-note-${entry.id}`}
                          className="text-area"
                          value={editNote}
                          onChange={(event) => setEditNote(event.target.value)}
                        />
                      </div>

                      <div className="cta-row">
                        <button
                          type="button"
                          className="button button--primary"
                          disabled={
                            isSubmittingEdit ||
                            editNote.trim().length === 0 ||
                            editSelectedTrack === null
                          }
                          onClick={() => void handleSaveEdit()}
                        >
                          {isSubmittingEdit ? '저장 중...' : '수정 저장'}
                        </button>
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={handleCancelEditing}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          className="button button--secondary"
                          disabled={deletingId === entry.id}
                          onClick={() => void handleDelete(entry.id)}
                        >
                          {deletingId === entry.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>{detail?.note ?? entry.notePreview}</p>
                      <p className="helper-text">앨범: {visibleTrack.albumName}</p>
                      <div className="history-card__toolbar">
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => void handleStartEditing(entry.id)}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="button button--secondary"
                          disabled={deletingId === entry.id}
                          onClick={() => void handleDelete(entry.id)}
                        >
                          {deletingId === entry.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          )
        })}

        {hasMore ? (
          <div className="cta-row">
            <button
              type="button"
              className="button button--secondary"
              disabled={isLoading}
              onClick={handleLoadMore}
            >
              {isLoading ? '불러오는 중...' : '더 보기'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
