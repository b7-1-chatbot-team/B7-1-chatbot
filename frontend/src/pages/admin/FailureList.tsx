import { getAdminFailures } from '@/api/admin'
import { LoadingStatus } from '@/components/Spinner'
import { Timestamp } from '@/components/Timestamp'
import { usePagedList } from '@/hooks/usePagedList'
import { formatErrorCode, formatLatency } from '@/utils/resultLabel'
import styles from './Admin.module.css'
import { RequestIdButton } from './ChatRecord'
import { LoadError } from './LoadError'
import { PagedFooter } from './PagedFooter'

/** AI 실패 기록 (docs/03-api.md 4-4절) — 시각 · 사용자 · code · 구분 · request_id */
export function FailureList({ onOpenRequest }: { onOpenRequest: (requestId: string) => void }) {
  const list = usePagedList(
    (page, signal) => getAdminFailures(page, signal),
    (failure) => failure.chat_id,
  )

  return (
    <section aria-labelledby="admin-failures-title" className={styles.panel}>
      <h2 id="admin-failures-title" className={styles.panelTitle}>
        AI 실패 기록 {list.isLoading ? '' : `(${list.total})`}
      </h2>
      {list.loadError ? (
        <LoadError what="AI 실패 기록" error={list.loadError} onRetry={list.retry} />
      ) : list.isLoading ? (
        <LoadingStatus>불러오는 중…</LoadingStatus>
      ) : list.items.length === 0 ? (
        <p className={styles.muted}>AI 실패 기록이 없습니다.</p>
      ) : (
        <>
          <ol aria-label="AI 실패" className={styles.records}>
            {list.items.map((failure) => (
              <li key={failure.chat_id}>
                <article aria-label={`실패 #${failure.chat_id}`} className={styles.record}>
                  <header className={styles.recordHead}>
                    <Timestamp iso={failure.created_at} />
                    <span className={styles.who}>{failure.email}</span>
                    <strong className={`${styles.chip} ${styles.chipError}`}>{formatErrorCode(failure.error_code)}</strong>
                    <span>{formatLatency(failure.latency_ms)}</span>
                    <RequestIdButton requestId={failure.request_id} onOpen={onOpenRequest} />
                  </header>
                  <p className={styles.question}>{failure.question}</p>
                </article>
              </li>
            ))}
          </ol>
          <PagedFooter
            hasMore={list.hasMore}
            isLoadingMore={list.isLoadingMore}
            moreError={list.moreError}
            onLoadMore={list.loadMore}
          />
        </>
      )}
    </section>
  )
}
