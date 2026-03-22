import styles from './TrackArtwork.module.css'

type TrackArtworkProps = {
  title: string
  albumImageUrl: string | null
  compact?: boolean
}

const getArtworkFallback = (title: string) =>
  title
    .split(' ')
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? '')
    .join('')

export function TrackArtwork({
  title,
  albumImageUrl,
  compact = false,
}: TrackArtworkProps) {
  return albumImageUrl ? (
    <img
      alt={`${title} 앨범 아트`}
      className={`${styles.artwork} ${compact ? styles['artwork--compact'] : ''}`}
      src={albumImageUrl}
    />
  ) : (
    <div
      aria-hidden="true"
      className={`${styles.artwork} ${compact ? styles['artwork--compact'] : ''}`}
    >
      <span>{getArtworkFallback(title)}</span>
    </div>
  )
}
