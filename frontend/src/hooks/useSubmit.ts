import { useCallback, useRef, useState } from 'react'

import { ApiError, isApiError } from '@/api/ApiError'

export interface Submission<Args extends unknown[], Result> {
  /** 실행한다. 이미 진행 중이거나 실패하면 undefined 를 돌려준다 */
  submit: (...args: Args) => Promise<Result | undefined>
  isSubmitting: boolean
  /** 마지막 실패. 화면은 error.code 로 분기한다 */
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
    async (...args: Args): Promise<Result | undefined> => {
      if (inFlight.current) return undefined

      inFlight.current = true
      setIsSubmitting(true)
      setError(null)

      try {
        return await action(...args)
      } catch (caught) {
        if (!isApiError(caught)) throw caught
        setError(caught)
        return undefined
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
