import { routePaths } from '../app/routes'
import { useAppLayoutContext } from '../app/layout-context'
import { JournalCard } from '../components/journal/JournalCard'
import { Notice } from '../components/ui/Notice'
import { Surface } from '../components/ui/Surface'
import { ActionButton } from '../components/ui/ActionButton'
import { demoJournalCards } from '../lib/demo-data'
import { toJournalCardModel } from '../lib/journal'
import { useHealthQuery, useRecentEntriesQuery } from '../hooks/useJournalQueries'
import styles from './OverviewPage.module.css'

export function OverviewPage() {
  const {
    appMode,
    isSessionPending,
    userName,
    spotifyAuthAvailability,
    onSignIn,
  } = useAppLayoutContext()
  const healthQuery = useHealthQuery()
  const recentEntriesQuery = useRecentEntriesQuery(appMode === 'authenticated')
  const canStartSpotifySignIn = spotifyAuthAvailability === 'enabled'
  const healthStatusLabel = healthQuery.isPending
    ? '백엔드 응답 확인 중'
    : healthQuery.data?.ok
      ? healthQuery.data.auth.spotifyEnabled
        ? '실서버와 Spotify 인증 준비됨'
        : '실서버 응답은 정상, 인증 설정 필요'
      : 'API 확인 필요'
  const healthStatusCopy = healthQuery.isPending
    ? '앱 진입 시 헬스체크를 먼저 확인합니다.'
    : healthQuery.data?.ok
      ? healthQuery.data.auth.spotifyEnabled
        ? '저널 목록, Spotify 검색, 로그인에 필요한 기본 연결이 살아 있습니다.'
        : 'API는 응답하지만 Spotify 로그인 provider는 아직 비활성화되어 있습니다.'
      : '게스트 데모는 쓸 수 있지만 실제 데이터 연결은 점검이 필요합니다.'

  const recentEntries =
    appMode === 'authenticated'
      ? (recentEntriesQuery.data?.items ?? []).map((entry) => toJournalCardModel(entry, 'live'))
      : demoJournalCards.slice(0, 3)

  return (
    <div className={styles.page}>
      <div className={styles.heroGrid}>
        <Surface className={styles.hero} tone="hero">
          <span className={styles.eyebrow}>베타 프론트 리디자인</span>
          <h1 className={styles.title}>오늘의 곡과 메모를 더 또렷한 리듬으로 남기는 저널</h1>
          <p className={styles.lead}>
            게스트는 샘플 라이브러리를 읽어볼 수 있고, 로그인한 사용자는 실제 Spotify 검색과
            저널 저장 흐름까지 바로 이어집니다.
          </p>
          <div className={styles.ctaRow}>
            {appMode === 'authenticated' ? (
              <>
                <ActionButton to={routePaths.capture} variant="primary">
                  오늘 기록하기
                </ActionButton>
                <ActionButton to={routePaths.library}>라이브러리 보기</ActionButton>
              </>
            ) : (
              <>
                <ActionButton
                  disabled={!canStartSpotifySignIn}
                  variant="primary"
                  onClick={onSignIn}
                >
                  {spotifyAuthAvailability === 'checking'
                    ? 'Spotify 상태 확인 중'
                    : 'Spotify 연결하기'}
                </ActionButton>
                <ActionButton to={routePaths.library}>데모 라이브러리 보기</ActionButton>
              </>
            )}
          </div>
        </Surface>

        <div className={styles.statusStack}>
          <Surface className={styles.statusCard}>
            <span className={styles.statusLabel}>세션 상태</span>
            <strong className={styles.statusValue}>
              {isSessionPending
                ? '세션 확인 중'
                : appMode === 'authenticated'
                  ? `${userName ?? '사용자'} 님 연결됨`
                  : '게스트 모드'}
            </strong>
            <p className={styles.statusCopy}>
              {appMode === 'authenticated'
                ? '기록 작성, 수정, 삭제와 Spotify 검색까지 모두 사용할 수 있습니다.'
                : spotifyAuthAvailability === 'disabled'
                  ? '서버에 Spotify 로그인 설정이 아직 없어 현재는 게스트 탐색만 가능합니다.'
                  : spotifyAuthAvailability === 'unknown'
                    ? '로그인 구성을 확인하지 못했습니다. 우선 게스트 탐색만 사용할 수 있습니다.'
                    : '인증이 없어도 홈과 라이브러리 데모 경험은 확인할 수 있습니다.'}
            </p>
          </Surface>

          <Surface className={styles.statusCard} tone="muted">
            <span className={styles.statusLabel}>API 상태</span>
            <strong className={styles.statusValue}>{healthStatusLabel}</strong>
            <p className={styles.statusCopy}>{healthStatusCopy}</p>
          </Surface>
        </div>
      </div>

      {appMode === 'authenticated' && recentEntriesQuery.error ? (
        <Notice tone="error">최근 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Notice>
      ) : null}

      <Surface className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionEyebrow}>
              {appMode === 'authenticated' ? '최근 기록' : '데모 프리뷰'}
            </span>
            <h2 className={styles.sectionTitle}>
              {appMode === 'authenticated' ? '최근에 남긴 곡과 메모' : '로그인 없이 둘러보는 샘플 기록'}
            </h2>
          </div>
          <ActionButton to={routePaths.library} variant="ghost">
            전체 보기
          </ActionButton>
        </div>

        {recentEntries.length > 0 ? (
          <div className={styles.cardGrid}>
            {recentEntries.map((entry) => (
              <JournalCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <Notice tone="subtle">아직 남긴 기록이 없습니다. 첫 번째 곡을 저장해 보세요.</Notice>
        )}
      </Surface>
    </div>
  )
}
