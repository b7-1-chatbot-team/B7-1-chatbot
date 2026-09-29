import { describe, expect, it } from 'vitest'

import { formatClock, formatDayLabel, formatFullTime, formatListTime, formatTime, isSameDay } from './datetime'

/** 기준 "지금" — 2026-09-29(화) 15:00 */
const NOW = new Date(2026, 8, 29, 15, 0)
const at = (y: number, m: number, d: number, h = 14, min = 5, s = 12) => new Date(y, m - 1, d, h, min, s).toISOString()

describe('시각 표기', () => {
  it('챗 말풍선은 시각만 — "14:05"', () => {
    expect(formatClock(at(2026, 9, 29))).toBe('14:05')
  })

  it('요청 흐름은 초까지 — "14:05:12"', () => {
    expect(formatTime(at(2026, 9, 29))).toBe('14:05:12')
  })

  it('날짜 구분선: 오늘 · 어제 · 올해 · 작년 이전', () => {
    expect(formatDayLabel(at(2026, 9, 29), NOW)).toBe('오늘')
    expect(formatDayLabel(at(2026, 9, 28, 23, 59), NOW)).toBe('어제')
    expect(formatDayLabel(at(2026, 9, 21), NOW)).toBe('9월 21일 (월)')
    expect(formatDayLabel(at(2025, 12, 3), NOW)).toBe('2025년 12월 3일 (수)')
  })

  it('목록: 오늘 14:05 · 어제 14:05 · 9월 21일 14:05 · 2025-12-03 14:05', () => {
    expect(formatListTime(at(2026, 9, 29), NOW)).toBe('오늘 14:05')
    expect(formatListTime(at(2026, 9, 28), NOW)).toBe('어제 14:05')
    expect(formatListTime(at(2026, 9, 21), NOW)).toBe('9월 21일 14:05')
    expect(formatListTime(at(2025, 12, 3, 9, 1), NOW)).toBe('2025-12-03 09:01')
  })

  it('자정을 넘기면 어제 — 24시간이 아니라 날짜로 센다', () => {
    const justAfterMidnight = new Date(2026, 8, 29, 0, 10)
    expect(formatDayLabel(at(2026, 9, 28, 23, 50), justAfterMidnight)).toBe('어제')
  })

  it('마우스를 올리면 보이는 전체 시각 — "2026-09-29 14:05:12"', () => {
    expect(formatFullTime(at(2026, 9, 29))).toBe('2026-09-29 14:05:12')
  })

  it('같은 날짜인지 비교한다 (시각은 무시)', () => {
    expect(isSameDay(at(2026, 9, 29, 0, 1), at(2026, 9, 29, 23, 59))).toBe(true)
    expect(isSameDay(at(2026, 9, 28, 23, 59), at(2026, 9, 29, 0, 1))).toBe(false)
  })

  it('읽을 수 없는 값이면 빈 문자열·false', () => {
    for (const format of [formatClock, formatTime, formatFullTime]) expect(format('invalid')).toBe('')
    expect(formatDayLabel('', NOW)).toBe('')
    expect(formatListTime('invalid', NOW)).toBe('')
    expect(isSameDay('invalid', at(2026, 9, 29))).toBe(false)
  })
})
