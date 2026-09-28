import { formatResultCode, isRetryable } from '@/utils/resultLabel'
import type { ChatMessage } from './types'

interface MessageBubbleProps {
  message: ChatMessage
  onRetry: (id: string) => void
  /** 다른 요청이 진행 중이면 [다시 시도] 를 잠근다 */
  retryDisabled: boolean
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** 말풍선 3종 + 응답 대기 표시 (docs/05-ui-ux.md 화면 3) */
export function MessageBubble({ message, onRetry, retryDisabled }: MessageBubbleProps) {
  if (message.kind === 'pending') {
    return (
      <li data-kind="pending" aria-label="응답을 기다리는 중">
        <span aria-hidden="true">● ● ●</span>
      </li>
    )
  }

  if (message.kind === 'error') {
    return (
      <li data-kind="error" role="alert">
        <p>{message.message}</p>
        <small>{formatResultCode(message.code)}</small>
        {/* 504·502 만 다시 보낼 가치가 있다. 422·500 은 같은 질문을 다시 보내도 결과가 같다 */}
        {isRetryable(message.code) ? (
          <button type="button" onClick={() => onRetry(message.id)} disabled={retryDisabled}>
            다시 시도
          </button>
        ) : null}
      </li>
    )
  }

  return (
    <li data-kind={message.kind}>
      {/* 줄바꿈을 살리되 HTML 로 해석하지 않는다 — AI 답변도 텍스트로만 렌더링 (XSS 방지, 05-ui-ux 2절) */}
      <p style={{ whiteSpace: 'pre-wrap' }}>{message.text}</p>
      <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
    </li>
  )
}
