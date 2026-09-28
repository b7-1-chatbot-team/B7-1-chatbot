import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError, isApiError } from '@/api/ApiError'

export interface AbortableRequest<T> {
  data: T | null
  isPending: boolean
  error: ApiError | null
  /** 같은 요청을 다시 보낸다 */
  reload: () => void
}

/**
 * 화면이 뜰 때 데이터를 불러오고, 화면을 벗어나면 진행 중인 요청을 취소한다.
 *
 * 화면마다 useEffect + AbortController + 상태 3개를 반복하지 않도록 한곳에 모았다.
 * 취소는 사용자가 화면을 떠난 것이라 오류로 취급하지 않는다.
 *
 * deps 가 바뀌면 이전 요청을 취소하고 새로 보낸다. 늦게 도착한 이전 응답이
 * 새 응답을 덮어쓰는 일을 막는다.
 *
 * @param fetcher signal 을 받아 axios 요청에 넘기는 함수
 * @param deps 바뀌면 다시 불러올 값들
 */
export function useAbortableRequest<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = [],
): AbortableRequest<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [isPending, setIsPending] = useState(true)
  const [version, setVersion] = useState(0)

  // fetcher 는 보통 렌더마다 새로 만들어지는 화살표 함수라 의존성에 넣지 않고 최신 값만 참조한다
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    const controller = new AbortController()
    setIsPending(true)
    setError(null)

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result)
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || axios.isCancel(caught)) return
        // 통신 계층이 모든 실패를 ApiError 로 바꾸므로 그 밖의 오류는 코드 결함이다
        if (!isApiError(caught)) throw caught
        setError(caught)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsPending(false)
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 호출한 쪽이 정한 deps 로만 다시 불러온다
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { data, isPending, error, reload }
}
