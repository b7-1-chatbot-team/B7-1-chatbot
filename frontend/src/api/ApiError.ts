import { RESULT_CODE } from './types'

/**
 * API 실패를 나타내는 오류.
 *
 * 이 서버는 실패도 HTTP 200 으로 주므로(docs/03-api.md §0) axios 가 에러를 던지지 않는다.
 * 응답 인터셉터가 body 의 code 를 보고 이 오류로 바꿔 던지고,
 * 화면은 catch 에서 code 별로 분기한다.
 *
 * 일반 객체가 아니라 Error 파생 클래스를 쓰는 이유는 instanceof 로 판별할 수 있고
 * 스택 추적이 남기 때문이다.
 */
export class ApiError extends Error {
  /** 결과 코드. 서버에 닿지 못한 경우는 0 (RESULT_CODE.unreachable) */
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }

  /** 서버에 닿지 못한 실패인가 (네트워크 끊김, 응답 형식이 아닌 경우) */
  get isUnreachable(): boolean {
    return this.code === RESULT_CODE.unreachable
  }
}

/** 서버에 닿지 못했을 때 쓰는 문구. 화면마다 다르게 적지 않는다 */
export const UNREACHABLE_MESSAGE = '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'

/** 서버가 응답했지만 안내 문구가 없을 때 쓰는 기본 문구 */
export const FALLBACK_MESSAGE = '요청을 처리하지 못했습니다.'

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
