import type { ChatLogItem } from '@/api/types'
import { formatDateTime } from '@/utils/datetime'

/** 대화 기록 한 건 (docs/05-ui-ux.md 화면 4) */
export function LogCard({ item }: { item: ChatLogItem }) {
  return (
    <article aria-label={`대화 #${item.chat_id}`}>
      <header>
        <span>#{item.chat_id}</span>{' '}
        <time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time>
      </header>
      <dl>
        <dt>질문</dt>
        {/* 줄바꿈은 살리되 HTML 로 해석하지 않는다 — AI 답변도 텍스트로만 (XSS 방지) */}
        <dd style={{ whiteSpace: 'pre-wrap' }}>{item.question}</dd>
        <dt>답변</dt>
        <dd style={{ whiteSpace: 'pre-wrap' }}>{item.answer}</dd>
      </dl>
    </article>
  )
}
