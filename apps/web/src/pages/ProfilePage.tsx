import { useAppLayoutContext } from '../app/layout-context'
import { JournalCard } from '../components/journal/JournalCard'
import { ActionButton } from '../components/ui/ActionButton'
import { Notice } from '../components/ui/Notice'
import { Surface } from '../components/ui/Surface'
import { useRecentEntriesQuery } from '../hooks/useJournalQueries'
import { toJournalCardModel } from '../lib/journal'
import styles from './ProfilePage.module.css'

const getProfileInitial = (userName: string | null) =>
  userName?.trim().charAt(0).toUpperCase() || 'M'

export function ProfilePage() {
  const {
    isAuthenticated,
    userName,
    spotifyAuthAvailability,
    onSignIn,
  } = useAppLayoutContext()
  const recentEntriesQuery = useRecentEntriesQuery(isAuthenticated)
  const recentEntries = (recentEntriesQuery.data?.items ?? []).map((entry) =>
    toJournalCardModel(entry, {
      authorName: userName,
    }),
  )
  const canStartSpotifySignIn = spotifyAuthAvailability === 'enabled'
  const signInLabel =
    spotifyAuthAvailability === 'checking' ? 'Spotify 상태 확인 중' : 'Spotify로 로그인'

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <Surface className={styles.hero} tone="hero">
          <div className={styles.avatar}>{getProfileInitial(userName)}</div>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Profile</span>
            <h1 className={styles.title}>내 음악 취향이 쌓이는 프로필을 시작해 보세요</h1>
            <p className={styles.copy}>
              로그인하면 내가 남긴 저널 수와 최근 기록이 한눈에 정리되는 개인 음악 아카이브가
              열립니다.
            </p>
            <ActionButton
              disabled={!canStartSpotifySignIn}
              onClick={onSignIn}
              variant="primary"
            >
              {signInLabel}
            </ActionButton>
          </div>
        </Surface>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Surface className={styles.hero} tone="hero">
        <div className={styles.avatar}>{getProfileInitial(userName)}</div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Profile</span>
          <h1 className={styles.title}>{`${userName ?? '내'} 프로필`}</h1>
          <p className={styles.copy}>최근에 남긴 음악 기록과 현재 세션 상태를 한 번에 확인합니다.</p>
        </div>
      </Surface>

      <div className={styles.summaryRow}>
        <Surface className={styles.stat}>
          <span className={styles.statLabel}>작성한 저널 수</span>
          <strong className={styles.statValue}>{isAuthenticated ? recentEntries.length : 0}</strong>
        </Surface>
      </div>

      {isAuthenticated && recentEntriesQuery.error ? (
        <Notice tone="error">프로필 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Notice>
      ) : null}

      {isAuthenticated && recentEntriesQuery.isPending ? (
        <Surface className={styles.panel}>
          <strong>프로필 기록을 불러오는 중입니다.</strong>
          <p>최근 카드 세 장을 정리하고 있습니다.</p>
        </Surface>
      ) : null}

      {isAuthenticated && !recentEntriesQuery.isPending && recentEntries.length === 0 ? (
        <Surface className={styles.panel}>
          <strong>아직 최근 기록이 없습니다.</strong>
          <p>새 기록이 생기면 이 프로필에 최근 카드가 먼저 나타납니다.</p>
        </Surface>
      ) : null}

      {recentEntries.length > 0 ? (
        <div className={styles.feed}>
          {recentEntries.map((entry) => (
            <JournalCard entry={entry} key={entry.id} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
