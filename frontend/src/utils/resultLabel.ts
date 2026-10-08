import { RESULT_CODE } from '@/api/types'

/**
 * 같은 질문으로 다시 보낼 가치가 있는 실패인가 — AI 타임아웃·호출 실패만 (docs/03-api.md 2-1절).
 * 429(요청 횟수 제한)는 넣지 않는다. 제한이 풀리기 전에 다시 보내면 또 429 가 난다
 */
export function isRetryable(code: number): boolean {
  return code === RESULT_CODE.aiTimeout || code === RESULT_CODE.aiCallFailed
}

/** 저장된 실패 기록의 error_code → 화면 표기. 기록에는 이름만 있어 결과 코드를 붙인다 */
const ERROR_CODE_NUMBERS: Record<string, number> = {
  AI_TIMEOUT: RESULT_CODE.aiTimeout,
  AI_CALL_FAILED: RESULT_CODE.aiCallFailed,
}

/** "504 · AI_TIMEOUT". 모르는 이름은 그대로 */
export function formatErrorCode(errorCode: string): string {
  const code = ERROR_CODE_NUMBERS[errorCode]
  return code ? `${code} · ${errorCode}` : errorCode
}

/** "1,320ms". 값이 없으면 "–" */
export function formatLatency(ms: number | null): string {
  return ms === null ? '–' : `${ms.toLocaleString('en-US')}ms`
}
