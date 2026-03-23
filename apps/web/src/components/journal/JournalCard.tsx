import { formatCreatedAtLabel } from '../../lib/format'
import { moodLabels, type JournalCardModel } from '../../lib/journal'
import { TrackArtwork } from './TrackArtwork'
import styles from './JournalCard.module.css'

type JournalCardProps = {
  entry: JournalCardModel
}

const getAuthorLabel = (entry: JournalCardModel) => entry.authorName ?? '작성자'
const getAvatarLabel = (entry: JournalCardModel) =>
  (entry.authorName ?? entry.track.name).slice(0, 1).toUpperCase()

export function JournalCard({ entry }: JournalCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.avatar}>{getAvatarLabel(entry)}</span>
          <div className={styles.identityCopy}>
            <strong>{getAuthorLabel(entry)}</strong>
            <span>{formatCreatedAtLabel(entry.createdAt)}</span>
          </div>
        </div>
        <span className={styles.mood}>{moodLabels[entry.mood]}</span>
      </div>

      <TrackArtwork albumImageUrl={entry.track.albumImageUrl} title={entry.track.name} />

      <div className={styles.body}>
        <div className={styles.trackRow}>
          <div className={styles.trackCopy}>
            <strong className={styles.title}>{entry.track.name}</strong>
            <span className={styles.artistLine}>{entry.track.artists.join(', ')}</span>
          </div>
          <a
            className={styles.spotifyLink}
            href={entry.track.spotifyUrl}
            rel="noreferrer"
            target="_blank"
          >
            Spotify
          </a>
        </div>
        <span className={styles.subtitle}>{entry.track.albumName}</span>
        <p className={styles.note}>{entry.note ?? entry.notePreview}</p>
      </div>
    </article>
  )
}
