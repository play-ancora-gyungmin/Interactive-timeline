import { useEffect, useState } from 'react'
import {
  ApiClientError,
  fetchJournalDetail,
  fetchJournalPreviews,
} from '../lib/api'
import {
  moodLabels,
  type JournalEntryDetail,
  type JournalPreview,
} from '../lib/journal'

type HistoryPageProps = {
  isAuthenticated: boolean
  onSignIn: () => void
}

export function HistoryPage({ isAuthenticated, onSignIn }: HistoryPageProps) {
  const [entries, setEntries] = useState<JournalPreview[]>([])
  const [detailsById, setDetailsById] = useState<Record<string, JournalEntryDetail>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
          목록은 커서 기반으로 불러오고, 펼친 엔트리의 상세는 별도 조회로 가져옵니다.
        </p>
      </section>

      {errorMessage ? (
        <div className="inline-banner inline-banner--error">{errorMessage}</div>
      ) : null}

      <section className="panel history-list">
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id
          const detail = detailsById[entry.id]

          return (
            <article key={entry.id} className="history-card">
              <div className="history-card__header">
                <div>
                  <div className="history-card__meta">{entry.entryDate}</div>
                  <h3 className="track-title">{entry.track.name}</h3>
                  <div className="track-meta">{entry.track.artists.join(', ')}</div>
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
                  <p>{detail?.note ?? entry.notePreview}</p>
                  <p className="helper-text">앨범: {entry.track.albumName}</p>
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
