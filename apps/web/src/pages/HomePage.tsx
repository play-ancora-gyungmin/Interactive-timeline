import { useEffect, useState } from 'react'
import { fetchApiHealth } from '../lib/api'
import { moodLabels, type JournalEntry } from '../lib/sample-data'

type HomePageProps = {
  entries: JournalEntry[]
  onStartEntry: () => void
}

type HealthStatus = 'loading' | 'ready' | 'error'

export function HomePage({ entries, onStartEntry }: HomePageProps) {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('loading')

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

  return (
    <div className="page">
      <section className="hero">
        <div className="panel panel--highlight">
          <span className="eyebrow">MVP shell ready</span>
          <h1 className="title">오늘의 감정을 한 곡과 함께 남겨두는 곳</h1>
          <p className="lead">
            홈, 오늘, 히스토리의 3개 화면 구조를 먼저 세웠습니다. 다음 단계는
            Spotify 검색과 날짜별 엔트리 API를 실제로 연결하는 것입니다.
          </p>
          <div className="cta-row">
            <button type="button" className="button button--primary" onClick={onStartEntry}>
              오늘 기록하기
            </button>
            <button type="button" className="button button--secondary">
              최근 3개 미리보기
            </button>
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
            <span className="status-pill status-pill--pending">Current focus</span>
            <strong>Phase 1 to Phase 2</strong>
            <p className="section-copy">
              앱 셸, 환경 변수, Prisma 스크립트, seed 준비까지 맞춘 상태입니다.
            </p>
          </div>
        </aside>
      </section>

      <section className="panel">
        <h2 className="section-title">최근 기록 3개</h2>
        {entries.length > 0 ? (
          <div className="entry-grid">
            {entries.map((entry) => (
              <article key={entry.id} className="entry-card">
                <div className="entry-card__date">{entry.entryDate}</div>
                <span className="mood-badge">{moodLabels[entry.mood]}</span>
                <h3>{entry.track.name}</h3>
                <p className="helper-text">{entry.track.artists.join(', ')}</p>
                <p>{entry.note}</p>
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
