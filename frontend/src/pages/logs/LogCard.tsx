import type { ChatLogItem } from '@/api/types'
import { Timestamp } from '@/components/Timestamp'
import styles from './LogsPage.module.css'

/** 대화 기록 한 건 (docs/05-ui-ux.md 화면 4) */
export function LogCard({ item }: { item: ChatLogItem }) {
  return (
    <article aria-label={`대화 #${item.chat_id}`} className={styles.card}>
      <header className={styles.cardHead}>
        <span>#{item.chat_id}</span>
        <Timestamp iso={item.created_at} />
      </header>
      {/* 줄바꿈은 살리되 HTML 로 해석하지 않는다 — AI 답변도 텍스트로만 (XSS 방지) */}
      <dl className={styles.qa}>
        <dt>질문</dt>
        <dd>{item.question}</dd>
        <dt>답변</dt>
        <dd className={styles.answer}>{item.answer}</dd>
      </dl>
    </article>
  )
}
