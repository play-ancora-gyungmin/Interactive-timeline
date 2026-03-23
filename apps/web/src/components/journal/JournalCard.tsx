import { formatCreatedAtLabel, formatEntryDateLabel } from '../../lib/format'
import { moodLabels, type JournalCardModel } from '../../lib/journal'
import { TrackArtwork } from './TrackArtwork'
import styles from './JournalCard.module.css'

type JournalCardProps = {
  entry: JournalCardModel
}

const getHeadline = (entry: JournalCardModel) => entry.track.artists.join(', ')

export function JournalCard({ entry }: JournalCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.avatar}>{entry.track.name.slice(0, 1).toUpperCase()}</span>
          <div className={styles.identityCopy}>
            <strong>{getHeadline(entry)}</strong>
            <span>{formatEntryDateLabel(entry.entryDate)}</span>
          </div>
        </div>
        <span className={styles.mood}>{moodLabels[entry.mood]}</span>
      </div>

      <TrackArtwork albumImageUrl={entry.track.albumImageUrl} title={entry.track.name} />

      <div className={styles.body}>
        <div className={styles.trackRow}>
          <strong className={styles.title}>{entry.track.name}</strong>
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
        <div className={styles.footer}>
          <span>{entry.track.artists.join(', ')}</span>
          <span>{formatCreatedAtLabel(entry.createdAt)}</span>
        </div>
      </div>
    </article>
  )
}
