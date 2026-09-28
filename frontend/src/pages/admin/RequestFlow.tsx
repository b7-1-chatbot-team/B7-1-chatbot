import { getRequestLogs } from '@/api/admin'
import { RESULT_CODE } from '@/api/types'
import { useAbortableRequest } from '@/hooks/useAbortableRequest'
import { formatTime } from '@/utils/datetime'
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
    <section aria-labelledby="admin-flow-title">
      <h2 id="admin-flow-title">요청 흐름 · request_id {requestId}</h2>
      <button type="button" onClick={onClose}>
        닫기
      </button>
      {logs.error?.code === RESULT_CODE.notFound ? (
        <p>로그가 없습니다.</p>
      ) : logs.error ? (
        <LoadError what="요청 흐름" error={logs.error} onRetry={logs.reload} />
      ) : logs.isPending || !logs.data ? (
        <p role="status">불러오는 중…</p>
      ) : (
        <ol aria-label="요청 흐름">
          {logs.data.items.map((event, index) => (
            <li key={index} data-level={event.level}>
              <time dateTime={event.created_at}>{formatTime(event.created_at)}</time>{' '}
              <strong>{event.level}</strong> <code>{event.event}</code> <span>{event.detail}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
