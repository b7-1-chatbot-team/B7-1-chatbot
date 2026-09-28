import { describe, expect, it } from 'vitest'

import { formatDateTime } from './datetime'

describe('formatDateTime', () => {
  it('서버 시각을 "YYYY-MM-DD HH:mm" 로 바꾼다', () => {
    const local = new Date(2026, 8, 14, 10, 5)
    expect(formatDateTime(local.toISOString())).toBe('2026-09-14 10:05')
  })

  it('읽을 수 없는 값이면 빈 문자열', () => {
    expect(formatDateTime('invalid')).toBe('')
    expect(formatDateTime('')).toBe('')
  })
})
