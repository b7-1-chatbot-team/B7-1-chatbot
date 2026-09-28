import { RESULT_CODE } from '@/api/types'

/**
 * 결과 코드의 구분 이름 (docs/05-ui-ux.md 5절).
 *
 * 화면 문구는 서버의 data.message 를 그대로 쓰고, 기술 표기(504 · AI_TIMEOUT)는 프론트가
 * code 로 붙인다. 사용자는 문장을, 개발자·평가자는 코드를 본다.
 * 같은 401 이라도 로그인 API 면 INVALID_CREDENTIALS 지만, 챗·로그 화면에서는 그 외 API 의
 * 401 만 보이므로 UNAUTHORIZED 로 둔다.
 */
const LABELS: Record<number, string> = {
  [RESULT_CODE.unreachable]: 'NETWORK_ERROR',
  [RESULT_CODE.unauthorized]: 'UNAUTHORIZED',
  [RESULT_CODE.forbidden]: 'FORBIDDEN',
  [RESULT_CODE.notFound]: 'NOT_FOUND',
  [RESULT_CODE.conflict]: 'EMAIL_ALREADY_EXISTS',
  [RESULT_CODE.validationError]: 'VALIDATION_ERROR',
  [RESULT_CODE.internalError]: 'INTERNAL_ERROR',
  [RESULT_CODE.aiCallFailed]: 'AI_CALL_FAILED',
  [RESULT_CODE.aiTimeout]: 'AI_TIMEOUT',
}

/** "504 · AI_TIMEOUT" 형태. 서버에 닿지 못한 경우(0)는 숫자 없이 이름만 */
export function formatResultCode(code: number): string {
  const label = LABELS[code] ?? 'UNKNOWN_ERROR'
  return code === RESULT_CODE.unreachable ? label : `${code} · ${label}`
}

/** 같은 질문으로 다시 보낼 가치가 있는 실패인가 — AI 타임아웃·호출 실패만 (docs/03-api.md 2-1절) */
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
