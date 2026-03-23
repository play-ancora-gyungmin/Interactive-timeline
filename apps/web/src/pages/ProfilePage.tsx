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
    toJournalCardModel(entry),
  )
  const canStartSpotifySignIn = spotifyAuthAvailability === 'enabled'
  const signInLabel =
    spotifyAuthAvailability === 'checking' ? 'Spotify 상태 확인 중' : 'Spotify로 로그인'

  return (
    <div className={styles.page}>
      <Surface className={styles.hero} tone="hero">
        <div className={styles.avatar}>{getProfileInitial(userName)}</div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Profile</span>
          <h1 className={styles.title}>
            {isAuthenticated ? `${userName ?? '내'} 프로필` : '프로필'}
          </h1>
          <p className={styles.copy}>
            {isAuthenticated
              ? '최근에 남긴 음악 기록과 현재 세션 상태를 한 번에 확인합니다.'
              : '라이브러리 탭은 프로필 페이지로 바꿨습니다. 로그인 후 내 기록만 보입니다.'}
          </p>
          {!isAuthenticated ? (
            <ActionButton
              disabled={!canStartSpotifySignIn}
              onClick={onSignIn}
              variant="primary"
            >
              {signInLabel}
            </ActionButton>
          ) : null}
        </div>
      </Surface>

      <div className={styles.statsGrid}>
        <Surface className={styles.stat}>
          <span className={styles.statLabel}>세션</span>
          <strong className={styles.statValue}>
            {isAuthenticated ? 'Spotify 연결됨' : '로그인 필요'}
          </strong>
        </Surface>
        <Surface className={styles.stat}>
          <span className={styles.statLabel}>최근 기록</span>
          <strong className={styles.statValue}>
            {isAuthenticated ? `${recentEntries.length}개 표시 중` : '0개'}
          </strong>
        </Surface>
        <Surface className={styles.stat}>
          <span className={styles.statLabel}>피드 상태</span>
          <strong className={styles.statValue}>
            {isAuthenticated ? '실제 데이터만 표시' : '데모 없음'}
          </strong>
        </Surface>
      </div>

      {isAuthenticated && recentEntriesQuery.error ? (
        <Notice tone="error">프로필 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Notice>
      ) : null}

      {!isAuthenticated ? (
        <Surface className={styles.panel}>
          <strong>로그인 후 프로필이 채워집니다.</strong>
          <p>게스트 샘플 없이 실제 사용자 정보와 최근 카드만 표시합니다.</p>
        </Surface>
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
