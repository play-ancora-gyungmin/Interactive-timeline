import { useAppLayoutContext } from '../app/layout-context'
import { JournalCard } from '../components/journal/JournalCard'
import { Notice } from '../components/ui/Notice'
import { Surface } from '../components/ui/Surface'
import { ActionButton } from '../components/ui/ActionButton'
import { useLibraryEntriesQuery } from '../hooks/useJournalQueries'
import { toJournalCardModel } from '../lib/journal'
import styles from './OverviewPage.module.css'

export function OverviewPage() {
  const { isAuthenticated, spotifyAuthAvailability } = useAppLayoutContext()
  const timelineQuery = useLibraryEntriesQuery(isAuthenticated)
  const timelineEntries =
    timelineQuery.data?.pages.flatMap((page) =>
      page.items.map((entry) => toJournalCardModel(entry)),
    ) ?? []

  return (
    <div className={styles.page}>
      {isAuthenticated && timelineQuery.error ? (
        <Notice tone="error">타임라인을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Notice>
      ) : null}

      {spotifyAuthAvailability === 'disabled' ? (
        <Notice tone="subtle">
          서버에 Spotify 로그인 설정이 없어 현재는 실제 타임라인을 열 수 없습니다.
        </Notice>
      ) : null}

      {spotifyAuthAvailability === 'unknown' ? (
        <Notice tone="error">
          로그인 구성을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.
        </Notice>
      ) : null}

      {isAuthenticated && timelineQuery.isPending ? (
        <Surface className={styles.emptyState}>
          <strong>타임라인을 불러오는 중입니다.</strong>
          <p>가장 최근 기록부터 차례대로 정리하고 있습니다.</p>
        </Surface>
      ) : null}

      {!isAuthenticated ? (
        <Surface className={styles.emptyState}>
          <strong>아직 표시할 타임라인이 없습니다.</strong>
          <p>Spotify로 로그인하면 데모 없이 실제 기록만 이 피드에 쌓입니다.</p>
        </Surface>
      ) : null}

      {isAuthenticated && !timelineQuery.isPending && timelineEntries.length === 0 ? (
        <Surface className={styles.emptyState}>
          <strong>첫 기록이 아직 없습니다.</strong>
          <p>기록이 저장되면 이 화면이 바로 인스타그램형 피드처럼 채워집니다.</p>
        </Surface>
      ) : null}

      {timelineEntries.length > 0 ? (
        <div className={styles.feed}>
          {timelineEntries.map((entry) => (
            <JournalCard entry={entry} key={entry.id} />
          ))}
        </div>
      ) : null}

      {isAuthenticated && timelineQuery.hasNextPage ? (
        <div className={styles.loadMore}>
          <ActionButton
            disabled={timelineQuery.isFetchingNextPage}
            onClick={() => void timelineQuery.fetchNextPage()}
            variant="secondary"
          >
            {timelineQuery.isFetchingNextPage ? '불러오는 중...' : '타임라인 더 보기'}
          </ActionButton>
        </div>
      ) : null}
    </div>
  )
}
