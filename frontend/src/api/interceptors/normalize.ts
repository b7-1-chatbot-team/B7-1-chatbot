import axios from 'axios'
import type { AxiosResponse } from 'axios'

import { ApiError, FALLBACK_MESSAGE, UNREACHABLE_MESSAGE } from '../ApiError'
import { RESULT_CODE } from '../types'
import type { ApiEnvelope, ApiFailureData } from '../types'

/**
 * 응답 인터셉터 — 공통 응답 형식을 벗기고, 실패를 ApiError 로 바꾼다.
 *
 * 이 서버는 성공·실패 모두 HTTP 200 으로 답하고 결과는 body 의 code 로만 판단한다
 * (docs/03-api.md §0). axios 는 200 을 성공으로 보고 에러를 던지지 않으므로,
 * 여기서 code 를 읽어 HTTP 규약대로 되돌린다.
 *
 * 여기서 하는 일은 **형식 변환뿐**이다. "어떤 화면을 띄울지" 같은 분기는 화면이 맡는다.
 */

function unreachable(): ApiError {
  // 상수로 재사용하지 않는다. 매번 새로 만들어야 스택 추적이 실제 발생 지점을 가리킨다
  return new ApiError(RESULT_CODE.unreachable, UNREACHABLE_MESSAGE)
}

/**
 * 성공 응답 처리.
 *
 * 봉투를 벗겨 response.data 를 안쪽 data 로 바꾼 뒤 AxiosResponse 를 그대로 반환한다.
 * data 만 반환하면 axios 의 선언 타입(AxiosResponse)과 실제 반환값이 어긋나므로
 * 형태를 유지한다. 엔드포인트 함수는 (await instance.get<T>(...)).data 로 받는다.
 */
export function normalizeResponse(response: AxiosResponse): AxiosResponse {
  const body: unknown = response.data

  // body 에 code 가 없음 = 서버가 준 응답이 아님 (Railway 앞단 502/503 등)
  if (!isEnvelope(body)) throw unreachable()

  if (body.code < 400) {
    response.data = body.data
    return response
  }

  const message = (body.data as ApiFailureData | undefined)?.message ?? FALLBACK_MESSAGE
  throw new ApiError(body.code, message)
}

/**
 * 실패 응답 처리 — 네트워크 끊김, 타임아웃, 요청 취소.
 *
 * 요청 취소는 오류가 아니라 의도된 중단이므로 그대로 통과시킨다.
 * 여기서 ApiError 로 바꾸면 사용자가 페이지를 벗어났을 뿐인데 에러 안내가 뜬다.
 */
export function normalizeError(error: unknown): never {
  if (axios.isCancel(error)) throw error
  if (error instanceof ApiError) throw error
  throw unreachable()
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return typeof body === 'object' && body !== null && typeof (body as { code?: unknown }).code === 'number'
}
