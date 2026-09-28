/**
 * 서버 시각(ISO 8601, +09:00) 을 화면용 "2026-09-14 10:05" 로 바꾼다.
 * 읽을 수 없는 값이면 빈 문자열 — 화면이 깨지지 않게 한다.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
