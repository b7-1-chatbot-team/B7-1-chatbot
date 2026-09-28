import { getAdminStats } from '@/api/admin'
import { useAbortableRequest } from '@/hooks/useAbortableRequest'
import { formatLatency } from '@/utils/resultLabel'
import { LoadError } from './LoadError'

/** 요약 카드 6칸 (docs/05-ui-ux.md 화면 5, docs/03-api.md 4-1절) */
export function StatsCards() {
  const stats = useAbortableRequest((signal) => getAdminStats(signal))

  if (stats.error) return <LoadError what="요약 통계" error={stats.error} onRetry={stats.reload} />

  const data = stats.data
  const cards: [string, string][] = [
    ['사용자', data ? String(data.users) : '…'],
    ['대화 성공', data ? String(data.chats.success) : '…'],
    ['대화 실패', data ? String(data.chats.failed) : '…'],
    ['AI_TIMEOUT', data ? String(data.failures.AI_TIMEOUT) : '…'],
    ['AI_CALL_FAILED', data ? String(data.failures.AI_CALL_FAILED) : '…'],
    ['평균 응답', data ? formatLatency(data.avg_latency_ms) : '…'],
  ]

  return (
    <dl aria-label="요약 통계" aria-busy={stats.isPending || undefined}>
      {cards.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
