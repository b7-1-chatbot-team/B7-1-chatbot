import type { AdminChat } from '@/api/types'
import { Timestamp } from '@/components/Timestamp'
import { formatErrorCode, formatLatency } from '@/utils/resultLabel'
import styles from './Admin.module.css'

interface ChatRecordProps {
  chat: AdminChat
  onOpenRequest: (requestId: string) => void
}

/** 관리자가 보는 대화 한 건 — 성공·실패 배지, 응답시간, 요청 흐름으로 가는 request_id */
export function ChatRecord({ chat, onOpenRequest }: ChatRecordProps) {
  const failed = chat.status === 'error'
  return (
    <article aria-label={`대화 #${chat.chat_id}`} data-status={chat.status} className={styles.record}>
      <header className={styles.recordHead}>
        <span>#{chat.chat_id}</span>
        <Timestamp iso={chat.created_at} />
        {/* 관리자 기록은 원인 추적용이라 결과 코드를 보여준다 (사용자 화면과 다르다) */}
        <strong className={`${styles.chip} ${failed ? styles.chipError : styles.chipOk}`}>
          {failed ? `ERROR ${formatErrorCode(chat.error_code ?? '')}` : 'SUCCESS'}
        </strong>
        <span>{formatLatency(chat.latency_ms)}</span>
        <RequestIdButton requestId={chat.request_id} onOpen={onOpenRequest} />
      </header>
      <dl className={styles.qa}>
        <dt>질문</dt>
        {/* 원문은 텍스트로만 — HTML 로 해석하지 않는다 (XSS 방지) */}
        <dd>{chat.question}</dd>
        {chat.answer !== null ? (
          <>
            <dt>답변</dt>
            <dd className={styles.answer}>{chat.answer}</dd>
          </>
        ) : null}
      </dl>
    </article>
  )
}

export function RequestIdButton({ requestId, onOpen }: { requestId: string; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      className={styles.requestId}
      onClick={() => onOpen(requestId)}
      aria-label={`요청 흐름 보기 ${requestId}`}
    >
      request {requestId}
    </button>
  )
}
