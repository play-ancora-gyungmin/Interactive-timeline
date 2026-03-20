import { useState } from 'react'
import { moodLabels, type JournalEntry } from '../lib/sample-data'

type HistoryPageProps = {
  entries: JournalEntry[]
}

export function HistoryPage({ entries }: HistoryPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(entries[0]?.id ?? null)

  if (entries.length === 0) {
    return <div className="empty-state">저장된 히스토리가 아직 없습니다.</div>
  }

  return (
    <div className="page">
      <section className="panel panel--highlight">
        <span className="eyebrow">History</span>
        <h1 className="section-title">최근 30일 기록을 같은 화면에서 펼쳐보기</h1>
        <p className="section-copy">
          문서 가이드대로 별도 상세 페이지 대신 같은 화면 안에서 엔트리를
          펼쳐보도록 구성했습니다.
        </p>
      </section>

      <section className="panel history-list">
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id

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
                  <p>{entry.note}</p>
                  <p className="helper-text">앨범: {entry.track.albumName}</p>
                </div>
              ) : null}
            </article>
          )
        })}
      </section>
    </div>
  )
}
