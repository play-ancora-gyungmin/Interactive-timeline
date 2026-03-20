import { useState } from 'react'
import { moodLabels, sampleEntries, type Mood, type TrackSummary } from '../lib/sample-data'

type TodayEntryPageProps = {
  onBrowseHistory: () => void
}

const trackCatalog: TrackSummary[] = [
  ...sampleEntries.map((entry) => entry.track),
  {
    spotifyTrackId: 'track-5',
    name: 'Glass Harbor',
    artists: ['Navy Orchard'],
    albumName: 'Slow Signal',
    albumImageUrl: null,
    spotifyUrl: 'https://open.spotify.com',
    previewUrl: null,
  },
]

export function TodayEntryPage({ onBrowseHistory }: TodayEntryPageProps) {
  const [selectedMood, setSelectedMood] = useState<Mood>('focused')
  const [note, setNote] = useState('')
  const [query, setQuery] = useState('')
  const [selectedTrack, setSelectedTrack] = useState<TrackSummary | null>(trackCatalog[0])
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const visibleTracks = trackCatalog.filter((track) => {
    if (!query.trim()) {
      return true
    }

    const keyword = query.trim().toLowerCase()
    const artistNames = track.artists.join(' ').toLowerCase()

    return (
      track.name.toLowerCase().includes(keyword) ||
      artistNames.includes(keyword) ||
      track.albumName.toLowerCase().includes(keyword)
    )
  })

  const isReadyToSave = note.trim().length > 0 && selectedTrack !== null

  const handleSave = () => {
    if (!isReadyToSave) {
      return
    }

    setLastSavedAt(new Date().toLocaleTimeString('ko-KR'))
  }

  return (
    <div className="page">
      <section className="panel panel--highlight">
        <span className="eyebrow">Today entry</span>
        <h1 className="section-title">오늘 남길 한 곡을 고르세요</h1>
        <p className="section-copy">
          실제 Spotify 검색과 날짜별 upsert는 다음 API 단계에서 붙습니다. 지금은 화면
          흐름과 상태 구성을 먼저 맞춘 상태입니다.
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
            저장 흐름 미리보기
          </button>
          <button type="button" className="button button--secondary" onClick={onBrowseHistory}>
            히스토리 보기
          </button>
        </div>

        {lastSavedAt ? (
          <div className="inline-banner">
            {lastSavedAt} 기준으로 화면 상태만 저장했습니다. 다음 단계에서
            `PUT /api/entries/by-date/:date`에 연결하면 됩니다.
          </div>
        ) : null}
      </section>
    </div>
  )
}
