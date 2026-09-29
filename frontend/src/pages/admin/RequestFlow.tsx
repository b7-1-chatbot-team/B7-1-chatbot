import { getRequestLogs } from '@/api/admin'
import { RESULT_CODE } from '@/api/types'
import { Button } from '@/components/Button'
import { LoadingStatus } from '@/components/Spinner'
import { useAbortableRequest } from '@/hooks/useAbortableRequest'
import { formatTime } from '@/utils/datetime'
import styles from './Admin.module.css'
import { LoadError } from './LoadError'

interface RequestFlowProps {
  requestId: string
  onClose: () => void
}

/**
 * 한 요청의 처리 흐름 (docs/03-api.md 4-5절) — 서버 로그를 시간순으로.
 * 실패한 대화가 어디서 멈췄는지(AI 호출·DB 저장) 추적하는 곳이다.
 */
export function RequestFlow({ requestId, onClose }: RequestFlowProps) {
  const logs = useAbortableRequest((signal) => getRequestLogs(requestId, signal), [requestId])

  return (
    <section aria-labelledby="admin-flow-title" className={styles.panel}>
      <div className={styles.flowHead}>
        <h2 id="admin-flow-title" className={styles.panelTitle}>
          요청 흐름 <span className={`${styles.mono} ${styles.muted}`}>· request_id {requestId}</span>
        </h2>
        <Button variant="ghost" size="sm" icon="close" label="닫기" onClick={onClose} />
      </div>
      {logs.error?.code === RESULT_CODE.notFound ? (
        <p className={styles.muted}>로그가 없습니다.</p>
      ) : logs.error ? (
        <LoadError what="요청 흐름" error={logs.error} onRetry={logs.reload} />
      ) : logs.isPending || !logs.data ? (
        <LoadingStatus>불러오는 중…</LoadingStatus>
      ) : (
        <ol aria-label="요청 흐름" className={styles.flow}>
          {logs.data.items.map((event, index) => (
            <li key={index} data-level={event.level}>
              <time dateTime={event.created_at}>{formatTime(event.created_at)}</time>
              <strong className={event.level === 'ERROR' ? styles.levelError : styles.levelInfo}>{event.level}</strong>
              <code className={styles.event}>{event.event}</code>
              <span className={styles.detail}>{event.detail}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
