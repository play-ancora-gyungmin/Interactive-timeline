import { formatCreatedAtLabel, formatEntryDateLabel } from '../../lib/format'
import { moodLabels, type JournalCardModel } from '../../lib/journal'
import { ActionButton } from '../ui/ActionButton'
import { TrackArtwork } from './TrackArtwork'
import styles from './JournalCard.module.css'

type JournalCardProps = {
  entry: JournalCardModel
  selected?: boolean
  actionLabel?: string
  onSelect?: () => void
}

export function JournalCard({
  entry,
  selected = false,
  actionLabel = '상세 보기',
  onSelect,
}: JournalCardProps) {
  return (
    <article className={`${styles.card} ${selected ? styles['card--selected'] : ''}`}>
      <div className={styles.header}>
        <TrackArtwork albumImageUrl={entry.track.albumImageUrl} compact title={entry.track.name} />
        <div className={styles.meta}>
          <div className={styles.dateRow}>
            <span>{formatEntryDateLabel(entry.entryDate)}</span>
            <span>{formatCreatedAtLabel(entry.createdAt)}</span>
          </div>
          <strong className={styles.title}>{entry.track.name}</strong>
          <div className={styles.subtitle}>{entry.track.artists.join(', ')}</div>
          <span className={styles.mood}>{moodLabels[entry.mood]}</span>
        </div>
      </div>
      <p className={styles.note}>{entry.notePreview}</p>
      <div className={styles.footer}>
        <span className={styles.source}>{entry.source === 'demo' ? '데모 기록' : '내 기록'}</span>
        {onSelect ? (
          <ActionButton variant={selected ? 'ghost' : 'secondary'} onClick={onSelect}>
            {selected ? '닫기' : actionLabel}
          </ActionButton>
        ) : null}
      </div>
    </article>
  )
}
