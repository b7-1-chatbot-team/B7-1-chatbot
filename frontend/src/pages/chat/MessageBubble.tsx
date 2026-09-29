import { Button } from '@/components/Button'
import { formatClock } from '@/utils/datetime'
import { isRetryable } from '@/utils/resultLabel'
import styles from './ChatPage.module.css'
import type { ChatMessage } from './types'

interface MessageBubbleProps {
  message: ChatMessage
  onRetry: (id: string) => void
  /** 다른 요청이 진행 중이면 다시 시도를 잠근다 */
  retryDisabled: boolean
}

/** 말풍선 3종 + 응답 대기 표시 (docs/05-ui-ux.md 화면 3) */
export function MessageBubble({ message, onRetry, retryDisabled }: MessageBubbleProps) {
  if (message.kind === 'pending') {
    return (
      <li data-kind="pending" className={`${styles.item} ${styles.bot}`} aria-label="응답을 기다리는 중">
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </li>
    )
  }

  if (message.kind === 'error') {
    return (
      <li data-kind="error" role="alert" className={`${styles.item} ${styles.bot} ${styles.error}`}>
        {/* 문구만 보여준다. 결과 코드는 사용자에게 필요 없는 정보다 (2026-09-29 결정) */}
        <p className={styles.bubble}>{message.message}</p>
        <div className={styles.meta}>
          <time dateTime={message.createdAt}>{formatClock(message.createdAt)}</time>
          {/* 504·502 만 다시 보낼 가치가 있다. 422·500 은 같은 질문을 다시 보내도 결과가 같다 */}
          {isRetryable(message.code) ? (
            <Button
              variant="ghost"
              size="sm"
              icon="refresh"
              label="다시 시도"
              onClick={() => onRetry(message.id)}
              disabled={retryDisabled}
            />
          ) : null}
        </div>
      </li>
    )
  }

  return (
    <li data-kind={message.kind} className={`${styles.item} ${message.kind === 'user' ? styles.user : styles.bot}`}>
      {/* 줄바꿈을 살리되 HTML 로 해석하지 않는다 — AI 답변도 텍스트로만 렌더링 (XSS 방지, 05-ui-ux 2절) */}
      <p className={styles.bubble}>{message.text}</p>
      <time dateTime={message.createdAt}>{formatClock(message.createdAt)}</time>
    </li>
  )
}
