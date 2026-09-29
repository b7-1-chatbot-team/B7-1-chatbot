import { getAdminStats } from '@/api/admin'
import { useAbortableRequest } from '@/hooks/useAbortableRequest'
import { formatLatency } from '@/utils/resultLabel'
import styles from './Admin.module.css'
import { LoadError } from './LoadError'

/** 요약 카드 6칸 (docs/05-ui-ux.md 화면 5, docs/03-api.md 4-1절) */
export function StatsCards() {
  const stats = useAbortableRequest((signal) => getAdminStats(signal))

  if (stats.error) return <LoadError what="요약 통계" error={stats.error} onRetry={stats.reload} />

  const data = stats.data
  // [이름, 값, 실패 수치인가, 이름이 코드인가]
  const cards: [string, string, boolean, boolean][] = [
    ['사용자', data ? String(data.users) : '…', false, false],
    ['대화 성공', data ? String(data.chats.success) : '…', false, false],
    ['대화 실패', data ? String(data.chats.failed) : '…', true, false],
    ['AI_TIMEOUT', data ? String(data.failures.AI_TIMEOUT) : '…', true, true],
    ['AI_CALL_FAILED', data ? String(data.failures.AI_CALL_FAILED) : '…', true, true],
    ['평균 응답', data ? formatLatency(data.avg_latency_ms) : '…', false, false],
  ]

  return (
    <dl aria-label="요약 통계" aria-busy={stats.isPending || undefined} className={styles.stats}>
      {cards.map(([label, value, warn, code]) => (
        <div key={label} className={`${styles.stat} ${warn ? styles.warn : ''}`}>
          <dt className={code ? styles.mono : undefined}>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
