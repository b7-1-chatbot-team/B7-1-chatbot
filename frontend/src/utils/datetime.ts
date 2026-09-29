/**
 * 시각 표기 (docs/design/prototype.html 상태 모음 10번 — 시간 표기 규칙).
 *
 * 기준은 **보는 사람의 오늘**이고 24시간제다. "3분 전" 같은 상대 표기는 쓰지 않는다 —
 * 기록을 추적하는 서비스라 정확한 시각이 필요하고, 화면을 켜 둔 동안 값이 낡는다.
 *
 * | 언제      | 챗 말풍선 | 챗 날짜 구분선         | 목록(로그·관리자)  |
 * |-----------|-----------|------------------------|--------------------|
 * | 오늘      | 14:05     | 오늘                   | 오늘 14:05         |
 * | 어제      | 14:05     | 어제                   | 어제 14:05         |
 * | 올해 그 전 | 14:05    | 9월 21일 (일)          | 9월 21일 14:05     |
 * | 작년 이전 | 14:05     | 2025년 12월 3일 (수)   | 2025-12-03 14:05   |
 *
 * 읽을 수 없는 값이면 빈 문자열 — 화면이 깨지지 않게 한다.
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n: number) => String(n).padStart(2, '0')

function parse(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** 두 시각 사이의 날짜 차이 (시각은 무시). 오늘 0, 어제 1 */
function daysBetween(date: Date, now: Date): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((start(now) - start(date)) / 86_400_000)
}

/** 같은 날짜인가 — 챗 날짜 구분선을 넣을 자리를 찾는다 */
export function isSameDay(a: string, b: string): boolean {
  const x = parse(a)
  const y = parse(b)
  return x !== null && y !== null && daysBetween(x, y) === 0
}

/** "14:05" — 챗 말풍선 */
export function formatClock(iso: string): string {
  const date = parse(iso)
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : ''
}

/** "10:05:30" — 요청 흐름처럼 한 요청 안의 순서를 보는 곳 */
export function formatTime(iso: string): string {
  const date = parse(iso)
  return date ? `${formatClock(iso)}:${pad(date.getSeconds())}` : ''
}

/** "오늘" · "어제" · "9월 21일 (일)" · "2025년 12월 3일 (수)" — 챗 날짜 구분선 */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const date = parse(iso)
  if (!date) return ''
  const days = daysBetween(date, now)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  const monthDay = `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`
  return date.getFullYear() === now.getFullYear() ? monthDay : `${date.getFullYear()}년 ${monthDay}`
}

/** "오늘 14:05" · "어제 14:05" · "9월 21일 14:05" · "2025-12-03 14:05" — 로그·관리자 목록 */
export function formatListTime(iso: string, now: Date = new Date()): string {
  const date = parse(iso)
  if (!date) return ''
  const days = daysBetween(date, now)
  const clock = formatClock(iso)
  if (days === 0) return `오늘 ${clock}`
  if (days === 1) return `어제 ${clock}`
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}월 ${date.getDate()}일 ${clock}`
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clock}`
}

/** "2026-09-28 14:05:12" — 목록 시각에 마우스를 올리면 보이는 전체 시각 (title) */
export function formatFullTime(iso: string): string {
  const date = parse(iso)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${formatTime(iso)}`
}
