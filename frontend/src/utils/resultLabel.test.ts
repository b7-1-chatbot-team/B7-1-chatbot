import { describe, expect, it } from 'vitest'

import { formatErrorCode, formatLatency, isRetryable } from './resultLabel'

describe('resultLabel', () => {
  it('다시 보낼 가치가 있는 것은 504·502 뿐이다', () => {
    expect(isRetryable(504)).toBe(true)
    expect(isRetryable(502)).toBe(true)
    expect(isRetryable(500)).toBe(false)
    expect(isRetryable(422)).toBe(false)
  })

  it('저장된 실패 이름에 결과 코드를 붙이고, 모르는 이름은 그대로 둔다', () => {
    expect(formatErrorCode('AI_TIMEOUT')).toBe('504 · AI_TIMEOUT')
    expect(formatErrorCode('AI_CALL_FAILED')).toBe('502 · AI_CALL_FAILED')
    expect(formatErrorCode('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })

  it('응답시간은 천 단위 쉼표와 ms, 값이 없으면 –', () => {
    expect(formatLatency(1320)).toBe('1,320ms')
    expect(formatLatency(30000)).toBe('30,000ms')
    expect(formatLatency(null)).toBe('–')
  })
})
