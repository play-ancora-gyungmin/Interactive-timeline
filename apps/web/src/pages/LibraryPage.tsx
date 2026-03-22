import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppLayoutContext } from '../app/layout-context'
import { JournalCard } from '../components/journal/JournalCard'
import { TrackArtwork } from '../components/journal/TrackArtwork'
import { ActionButton } from '../components/ui/ActionButton'
import { Notice } from '../components/ui/Notice'
import { Surface } from '../components/ui/Surface'
import {
  useDeleteJournalEntryMutation,
  useJournalDetailQuery,
  useLibraryEntriesQuery,
  useSpotifyTrackSearchQuery,
  useUpdateJournalEntryMutation,
} from '../hooks/useJournalQueries'
import { ApiClientError } from '../lib/api'
import { demoJournalCards, getDemoJournalDetail } from '../lib/demo-data'
import { formatCreatedAtLabel, formatEntryDateLabel } from '../lib/format'
import {
  moodLabels,
  toJournalCardModel,
  type JournalEntryDetail,
  type Mood,
  type TrackSummary,
} from '../lib/journal'
import styles from './LibraryPage.module.css'

function getLibraryErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return '로그인이 필요합니다.'
    }

    if (error.status === 404) {
      return '선택한 기록을 찾지 못했습니다.'
    }

    return error.message
  }

  return fallbackMessage
}

export function LibraryPage() {
  const { appMode, onSignIn } = useAppLayoutContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const libraryEntriesQuery = useLibraryEntriesQuery(appMode === 'authenticated')
  const updateMutation = useUpdateJournalEntryMutation()
  const deleteMutation = useDeleteJournalEntryMutation()
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const liveEntries = useMemo(
    () =>
      libraryEntriesQuery.data?.pages.flatMap((page) =>
        page.items.map((entry) => toJournalCardModel(entry, 'live')),
      ) ?? [],
    [libraryEntriesQuery.data],
  )

  const entries = appMode === 'authenticated' ? liveEntries : demoJournalCards
  const selectedEntryId = searchParams.get('entry')
  const isEditMode =
    appMode === 'authenticated' &&
    searchParams.get('mode') === 'edit' &&
    Boolean(selectedEntryId)

  const selectedPreview = entries.find((entry) => entry.id === selectedEntryId) ?? null
  const detailQuery = useJournalDetailQuery(
    selectedEntryId,
    appMode === 'authenticated' && Boolean(selectedEntryId),
  )

  const selectedEntry =
    appMode === 'authenticated'
      ? detailQuery.data
        ? toJournalCardModel(detailQuery.data, 'live')
        : selectedPreview
      : selectedEntryId
        ? toJournalCardModel(getDemoJournalDetail(selectedEntryId) ?? selectedPreview!, 'demo')
        : null

  const updateSelectedEntry = (nextEntryId: string | null, mode?: 'edit') => {
    const next = new URLSearchParams(searchParams)

    if (nextEntryId) {
      next.set('entry', nextEntryId)
    } else {
      next.delete('entry')
    }

    if (mode) {
      next.set('mode', mode)
    } else {
      next.delete('mode')
    }

    setSearchParams(next)
  }

  const handleDelete = async () => {
    if (!selectedEntryId) {
      return
    }

    setActionMessage(null)
    setErrorMessage(null)

    try {
      await deleteMutation.mutateAsync(selectedEntryId)
      setConfirmDelete(false)
      updateSelectedEntry(null)
      setActionMessage('기록을 삭제했습니다.')
    } catch (error) {
      setErrorMessage(getLibraryErrorMessage(error, '기록을 삭제하지 못했습니다.'))
    }
  }

  const libraryError =
    appMode === 'authenticated' && libraryEntriesQuery.error
      ? getLibraryErrorMessage(libraryEntriesQuery.error, '라이브러리를 불러오지 못했습니다.')
      : null

  const detailError =
    appMode === 'authenticated' && detailQuery.error
      ? getLibraryErrorMessage(detailQuery.error, '상세 기록을 불러오지 못했습니다.')
      : null

  return (
    <div className={styles.page}>
      <Surface className={styles.hero} tone="hero">
        <span className={styles.sectionEyebrow}>라이브러리</span>
        <h1 className={styles.sectionTitle}>지난 기록을 카드 피드와 상세 시트로 다시 읽습니다</h1>
        <p className={styles.sectionCopy}>
          게스트는 샘플 기록을 읽기 전용으로 탐색하고, 로그인한 사용자는 수정과 삭제까지
          이어갈 수 있습니다.
        </p>
        {appMode === 'guest' ? (
          <div className={styles.ctaRow}>
            <ActionButton variant="primary" onClick={onSignIn}>
              Spotify 연결하기
            </ActionButton>
          </div>
        ) : null}
      </Surface>

      {actionMessage ? <Notice tone="success">{actionMessage}</Notice> : null}
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      {libraryError ? <Notice tone="error">{libraryError}</Notice> : null}
      {detailError ? <Notice tone="error">{detailError}</Notice> : null}

      <div className={styles.grid}>
        <Surface className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>
                {appMode === 'authenticated' ? '내 기록' : '샘플 기록'}
              </span>
              <h2 className={styles.panelTitle}>피드 목록</h2>
            </div>
          </div>

          {appMode === 'authenticated' && libraryEntriesQuery.isPending ? (
            <Notice tone="subtle">라이브러리를 불러오는 중입니다.</Notice>
          ) : entries.length > 0 ? (
            <div className={styles.cardList}>
              {entries.map((entry) => {
                const isSelected = entry.id === selectedEntryId

                return (
                  <JournalCard
                    actionLabel="열기"
                    entry={entry}
                    key={entry.id}
                    onSelect={() => updateSelectedEntry(isSelected ? null : entry.id)}
                    selected={isSelected}
                  />
                )
              })}
            </div>
          ) : (
            <Notice tone="subtle">저장된 기록이 없습니다. 새 기록을 먼저 남겨 보세요.</Notice>
          )}

          {appMode === 'authenticated' && libraryEntriesQuery.hasNextPage ? (
            <ActionButton
              disabled={libraryEntriesQuery.isFetchingNextPage}
              onClick={() => void libraryEntriesQuery.fetchNextPage()}
              variant="secondary"
            >
              {libraryEntriesQuery.isFetchingNextPage ? '불러오는 중...' : '더 보기'}
            </ActionButton>
          ) : null}
        </Surface>

        <Surface className={styles.detailPanel}>
          {selectedEntry ? (
            <>
              <div className={styles.detailHeader}>
                <TrackArtwork
                  albumImageUrl={selectedEntry.track.albumImageUrl}
                  title={selectedEntry.track.name}
                />
                <div className={styles.detailCopy}>
                  <span className={styles.panelEyebrow}>
                    {selectedEntry.source === 'demo' ? '데모 상세' : '선택한 기록'}
                  </span>
                  <h2 className={styles.detailTitle}>{selectedEntry.track.name}</h2>
                  <span>{selectedEntry.track.artists.join(', ')}</span>
                  <span>{selectedEntry.track.albumName}</span>
                  <div className={styles.detailMeta}>
                    <span>{formatEntryDateLabel(selectedEntry.entryDate)}</span>
                    <span>{formatCreatedAtLabel(selectedEntry.createdAt)}</span>
                    <span>{moodLabels[selectedEntry.mood]}</span>
                  </div>
                </div>
              </div>

              {isEditMode ? (
                detailQuery.data ? (
                  <LibraryEditor
                    detail={detailQuery.data}
                    key={detailQuery.data.id}
                    onCancel={() => updateSelectedEntry(detailQuery.data!.id)}
                    onDelete={() => setConfirmDelete(true)}
                    onError={setErrorMessage}
                    onSaved={setActionMessage}
                    updateMutation={updateMutation}
                  />
                ) : (
                  <Notice tone="subtle">상세 데이터를 불러오는 중입니다.</Notice>
                )
              ) : (
                <>
                  <p className={styles.detailNote}>
                    {selectedEntry.note ?? '상세 기록을 불러오면 전체 메모가 표시됩니다.'}
                  </p>
                  <div className={styles.detailActions}>
                    <ActionButton href={selectedEntry.track.spotifyUrl} variant="ghost">
                      Spotify 열기
                    </ActionButton>
                    {selectedEntry.track.previewUrl ? (
                      <audio controls className={styles.audio} src={selectedEntry.track.previewUrl}>
                        미리듣기를 지원하지 않는 브라우저입니다.
                      </audio>
                    ) : null}
                  </div>
                  {appMode === 'authenticated' ? (
                    <div className={styles.ctaRow}>
                      <ActionButton
                        onClick={() => updateSelectedEntry(selectedEntry.id, 'edit')}
                        variant="secondary"
                      >
                        수정
                      </ActionButton>
                      <ActionButton onClick={() => setConfirmDelete(true)} variant="danger">
                        삭제
                      </ActionButton>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <Notice tone="subtle">
              왼쪽 피드에서 카드를 선택하면 이 영역에서 상세 메모를 확인할 수 있습니다.
            </Notice>
          )}
        </Surface>
      </div>

      {confirmDelete && appMode === 'authenticated' && selectedEntryId ? (
        <div aria-modal="true" className={styles.dialogOverlay} role="dialog">
          <div className={styles.dialog}>
            <strong className={styles.dialogTitle}>이 기록을 정말 삭제할까요?</strong>
            <p className={styles.dialogCopy}>
              삭제하면 라이브러리 피드에서 즉시 사라지고 되돌릴 수 없습니다.
            </p>
            <div className={styles.ctaRow}>
              <ActionButton onClick={() => setConfirmDelete(false)} variant="ghost">
                취소
              </ActionButton>
              <ActionButton
                disabled={deleteMutation.isPending}
                onClick={() => void handleDelete()}
                variant="danger"
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제하기'}
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type LibraryEditorProps = {
  detail: JournalEntryDetail
  updateMutation: ReturnType<typeof useUpdateJournalEntryMutation>
  onSaved: (message: string) => void
  onError: (message: string) => void
  onCancel: () => void
  onDelete: () => void
}

function LibraryEditor({
  detail,
  updateMutation,
  onSaved,
  onError,
  onCancel,
  onDelete,
}: LibraryEditorProps) {
  const [editMood, setEditMood] = useState<Mood>(detail.mood)
  const [editNote, setEditNote] = useState(detail.note)
  const [editQuery, setEditQuery] = useState('')
  const [selectedTrackId, setSelectedTrackId] = useState(detail.track.spotifyTrackId)
  const deferredEditQuery = useDeferredValue(editQuery.trim())
  const editSearchQuery = useSpotifyTrackSearchQuery(deferredEditQuery, true)
  const searchResults = editSearchQuery.data ?? []
  const editSelectedTrack: TrackSummary | null =
    searchResults.find((track) => track.spotifyTrackId === selectedTrackId) ??
    (selectedTrackId === detail.track.spotifyTrackId ? detail.track : searchResults[0] ?? null)

  const editSearchError =
    editSearchQuery.error instanceof ApiClientError || editSearchQuery.error
      ? getLibraryErrorMessage(editSearchQuery.error, 'Spotify 검색 결과를 불러오지 못했습니다.')
      : null

  const handleSaveEdit = async () => {
    if (!editSelectedTrack || editNote.trim().length === 0) {
      return
    }

    try {
      const updated = await updateMutation.mutateAsync({
        journalId: detail.id,
        payload: {
          mood: editMood,
          note: editNote.trim(),
          spotifyTrackId: editSelectedTrack.spotifyTrackId,
        },
      })

      onSaved(`${updated.entryDate} 기록을 수정했습니다.`)
      onCancel()
    } catch (error) {
      onError(getLibraryErrorMessage(error, '기록을 수정하지 못했습니다.'))
    }
  }

  return (
    <div className={styles.editor}>
      <div className={styles.fieldStack}>
        <span className={styles.label}>Mood</span>
        <div className={styles.moodGrid}>
          {Object.entries(moodLabels).map(([mood, label]) => (
            <button
              key={mood}
              className={`${styles.moodButton} ${
                editMood === mood ? styles['moodButton--active'] : ''
              }`}
              onClick={() => setEditMood(mood as Mood)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fieldStack}>
        <label className={styles.label} htmlFor="library-track-search">
          Spotify track search
        </label>
        <input
          className={styles.input}
          id="library-track-search"
          onChange={(event) => setEditQuery(event.target.value)}
          placeholder="다른 곡으로 바꾸려면 검색하세요"
          value={editQuery}
        />
      </div>

      {editSearchQuery.isFetching ? <Notice tone="subtle">Spotify 검색 중...</Notice> : null}
      {editSearchError ? <Notice tone="error">{editSearchError}</Notice> : null}

      {searchResults.length > 0 ? (
        <div className={styles.searchList}>
          {searchResults.map((track) => (
            <article className={styles.searchResult} key={track.spotifyTrackId}>
              <TrackArtwork albumImageUrl={track.albumImageUrl} compact title={track.name} />
              <div className={styles.searchCopy}>
                <strong>{track.name}</strong>
                <span>{track.artists.join(', ')}</span>
              </div>
              <ActionButton
                onClick={() => setSelectedTrackId(track.spotifyTrackId)}
                variant="secondary"
              >
                선택
              </ActionButton>
            </article>
          ))}
        </div>
      ) : null}

      {editSelectedTrack ? (
        <div className={styles.selectedTrack}>
          <TrackArtwork
            albumImageUrl={editSelectedTrack.albumImageUrl}
            compact
            title={editSelectedTrack.name}
          />
          <div className={styles.selectedTrackCopy}>
            <strong>{editSelectedTrack.name}</strong>
            <span>{editSelectedTrack.artists.join(', ')}</span>
            <span>{editSelectedTrack.albumName}</span>
          </div>
        </div>
      ) : null}

      <div className={styles.fieldStack}>
        <label className={styles.label} htmlFor="library-note">
          Journal note
        </label>
        <textarea
          className={styles.textarea}
          id="library-note"
          onChange={(event) => setEditNote(event.target.value)}
          value={editNote}
        />
      </div>

      <div className={styles.ctaRow}>
        <ActionButton
          disabled={
            updateMutation.isPending ||
            editNote.trim().length === 0 ||
            editSelectedTrack === null
          }
          onClick={() => void handleSaveEdit()}
          variant="primary"
        >
          {updateMutation.isPending ? '저장 중...' : '수정 저장'}
        </ActionButton>
        <ActionButton onClick={onCancel} variant="ghost">
          편집 취소
        </ActionButton>
        <ActionButton onClick={onDelete} variant="danger">
          삭제
        </ActionButton>
      </div>
    </div>
  )
}
