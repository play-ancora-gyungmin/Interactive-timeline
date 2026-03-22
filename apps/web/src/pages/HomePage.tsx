import { useEffect, useState } from 'react'
import {
  ApiClientError,
  fetchApiHealth,
  fetchJournalPreviews,
} from '../lib/api'
import { moodLabels, type JournalPreview } from '../lib/journal'

type HomePageProps = {
  isAuthenticated: boolean
  onStartEntry: () => void
  onSignIn: () => void
}

type HealthStatus = 'loading' | 'ready' | 'error'

export function HomePage({
  isAuthenticated,
  onStartEntry,
  onSignIn,
}: HomePageProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('loading')
  const [entries, setEntries] = useState<JournalPreview[]>([])
  const [entriesError, setEntriesError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchApiHealth(controller.signal)
      .then((isHealthy) => {
        setHealthStatus(isHealthy ? 'ready' : 'error')
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHealthStatus('error')
        }
      })

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const controller = new AbortController()

    fetchJournalPreviews(3, undefined, controller.signal)
      .then((data) => {
        setEntries(data.items)
        setEntriesError(null)
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return
        }

        if (error instanceof ApiClientError && error.status === 401) {
          setEntriesError('세션이 만료되었습니다. 다시 로그인해 주세요.')
          return
        }

        setEntriesError('최근 기록을 불러오지 못했습니다.')
      })

    return () => {
      controller.abort()
    }
  }, [isAuthenticated])

  const visibleEntries = isAuthenticated ? entries : []
  const visibleEntriesError = isAuthenticated ? entriesError : null

  return (
    <div className="page">
      <section className="hero">
        <div className="panel panel--highlight">
          <span className="eyebrow">Spotify journal ready</span>
          <h1 className="title">오늘의 감정을 한 곡과 함께 남겨두는 곳</h1>
          <p className="lead">
            Spotify 검색으로 곡을 고르고, 로그인한 사용자 기준으로 오늘의 기록과
            히스토리를 실제 API에서 불러옵니다.
          </p>
          <div className="cta-row">
            {isAuthenticated ? (
              <button type="button" className="button button--primary" onClick={onStartEntry}>
                오늘 기록하기
              </button>
            ) : (
              <button type="button" className="button button--primary" onClick={onSignIn}>
                Spotify로 시작하기
              </button>
            )}
          </div>
        </div>

        <aside className="meta-grid">
          <div className="status-card">
            <span
              className={`status-pill ${
                healthStatus === 'ready'
                  ? 'status-pill--success'
                  : healthStatus === 'error'
                    ? 'status-pill--error'
                    : 'status-pill--pending'
              }`}
            >
              {healthStatus === 'ready'
                ? 'API connected'
                : healthStatus === 'error'
                  ? 'API unavailable'
                  : 'Checking API'}
            </span>
            <strong>/api/health</strong>
            <p className="section-copy">
              {healthStatus === 'ready'
                ? '백엔드 기본 헬스체크가 응답하고 있습니다.'
                : healthStatus === 'error'
                  ? '웹 셸은 준비됐지만 API 서버가 아직 떠 있지 않습니다.'
                  : '앱 진입 시 기본 헬스체크를 확인합니다.'}
            </p>
          </div>

          <div className="status-card">
            <span
              className={`status-pill ${
                isAuthenticated ? 'status-pill--success' : 'status-pill--pending'
              }`}
            >
              {isAuthenticated ? 'Session ready' : 'Login required'}
            </span>
            <strong>Spotify catalog + journals</strong>
            <p className="section-copy">
              {isAuthenticated
                ? '저널 생성과 조회 시 Spotify 데이터를 실제로 사용합니다.'
                : 'Spotify 로그인 후 검색, 저장, 히스토리 조회를 사용할 수 있습니다.'}
            </p>
          </div>
        </aside>
      </section>

      <section className="panel">
        <h2 className="section-title">최근 기록 3개</h2>
        {!isAuthenticated ? (
          <div className="empty-state">로그인하면 최근 기록을 불러옵니다.</div>
        ) : visibleEntriesError ? (
          <div className="inline-banner inline-banner--error">{visibleEntriesError}</div>
        ) : visibleEntries.length > 0 ? (
          <div className="entry-grid">
            {visibleEntries.map((entry) => (
              <article key={entry.id} className="entry-card">
                <div className="entry-card__date">{entry.entryDate}</div>
                <span className="mood-badge">{moodLabels[entry.mood]}</span>
                <h3>{entry.track.name}</h3>
                <p className="helper-text">{entry.track.artists.join(', ')}</p>
                <p>{entry.notePreview}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">아직 기록이 없습니다. 첫 곡을 남겨보세요.</div>
        )}
      </section>
    </div>
  )
}
