import { useCallback, useRef, useState } from 'react'

import { ApiError, isApiError } from '@/api/ApiError'

/**
 * 제출 결과.
 *
 * 성공·실패를 반환값의 모양으로 구분한다. 성공 여부를 별도 상태(error)로 판단하면
 * 그 값이 **이전 렌더의 클로저**라 방금 실패를 알아채지 못한다.
 * 반환 타입이 void 인 작업(로그인)도 이 형태면 안전하게 구분된다.
 */
export type SubmitResult<Result> =
  | { ok: true; data: Result }
  | { ok: false; error: ApiError | null }

export interface Submission<Args extends unknown[], Result> {
  submit: (...args: Args) => Promise<SubmitResult<Result>>
  isSubmitting: boolean
  /** 마지막 실패. 화면 하단 안내처럼 렌더 중에 쓸 때 사용한다 */
  error: ApiError | null
  reset: () => void
}

/**
 * 비동기 제출의 진행 상태와 오류를 관리한다.
 *
 * 로그인·회원가입·챗 전송이 모두 같은 일을 한다. 보내는 동안 버튼을 잠그고,
 * 실패하면 ApiError 를 받아 code 별로 안내한다.
 *
 * 중복 제출은 ref 로 막는다. isSubmitting 상태만으로 막으면 같은 렌더 안에서
 * 연속으로 눌렸을 때 아직 갱신되지 않은 값을 보고 두 번 보낼 수 있다.
 *
 * ApiError 가 아닌 오류는 보관하지 않고 다시 던진다. 통신 계층이 모든 실패를
 * ApiError 로 바꾸므로, 그 밖의 오류는 코드 결함이라 삼키면 안 된다.
 */
export function useSubmit<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
): Submission<Args, Result> {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const inFlight = useRef(false)

  const submit = useCallback(
    async (...args: Args): Promise<SubmitResult<Result>> => {
      // 이미 보내는 중이다. 오류가 아니므로 error 를 채우지 않는다
      if (inFlight.current) return { ok: false, error: null }

      inFlight.current = true
      setIsSubmitting(true)
      setError(null)

      try {
        return { ok: true, data: await action(...args) }
      } catch (caught) {
        if (!isApiError(caught)) throw caught
        setError(caught)
        return { ok: false, error: caught }
      } finally {
        inFlight.current = false
        setIsSubmitting(false)
      }
    },
    [action],
  )

  const reset = useCallback(() => setError(null), [])

  return { submit, isSubmitting, error, reset }
}
