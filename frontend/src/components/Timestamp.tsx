import { formatFullTime, formatListTime } from '@/utils/datetime'

/**
 * 목록 시각 — "오늘 14:05" · "9월 21일 14:05", 마우스를 올리면 전체 시각 (utils/datetime.ts 규칙).
 * 로그 카드·관리자 목록이 같은 규칙으로 쓰도록 한 곳에 둔다.
 */
export function Timestamp({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} title={formatFullTime(iso)} className={className}>
      {formatListTime(iso)}
    </time>
  )
}
