import { act, renderHook, waitFor } from '@testing-library/react'
import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/ApiError'
import { RESULT_CODE } from '@/api/types'
import { useAbortableRequest } from './useAbortableRequest'

describe('useAbortableRequest', () => {
  it('불러온 결과를 돌려주고 진행 상태를 끈다', async () => {
    const { result } = renderHook(() => useAbortableRequest(async () => ['a', 'b']))

    expect(result.current.isPending).toBe(true)
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.data).toEqual(['a', 'b'])
    expect(result.current.error).toBeNull()
  })

  it('실패하면 ApiError 를 담는다', async () => {
    const { result } = renderHook(() =>
      useAbortableRequest(async () => {
        throw new ApiError(RESULT_CODE.internalError, '서버 내부 오류가 발생했습니다.')
      }),
    )

    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.error?.code).toBe(RESULT_CODE.internalError)
    expect(result.current.data).toBeNull()
  })

  it('화면을 벗어나면 진행 중인 요청을 취소한다', () => {
    let received: AbortSignal | undefined
    const { unmount } = renderHook(() =>
      useAbortableRequest((signal) => {
        received = signal
        return new Promise(() => {})
      }),
    )

    unmount()

    expect(received?.aborted).toBe(true)
  })

  it('취소는 오류로 취급하지 않는다', async () => {
    const fetcher = vi.fn((signal: AbortSignal) =>
      new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new axios.CanceledError()))
      }),
    )
    const { result, rerender } = renderHook(({ dep }) => useAbortableRequest(fetcher, [dep]), {
      initialProps: { dep: 1 },
    })

    // deps 가 바뀌면 이전 요청이 취소된다
    rerender({ dep: 2 })
    await act(async () => {})

    expect(result.current.error).toBeNull()
  })

  it('deps 가 바뀌면 늦게 온 이전 응답이 새 응답을 덮어쓰지 않는다', async () => {
    const resolvers: ((value: string) => void)[] = []
    const { result, rerender } = renderHook(
      ({ dep }) =>
        useAbortableRequest(
          () => new Promise<string>((resolve) => resolvers.push(resolve)),
          [dep],
        ),
      { initialProps: { dep: 1 } },
    )
    rerender({ dep: 2 })

    await act(async () => resolvers[1]('새 응답'))
    await act(async () => resolvers[0]('옛 응답'))

    expect(result.current.data).toBe('새 응답')
  })

  it('reload 로 다시 불러온다', async () => {
    let count = 0
    const { result } = renderHook(() => useAbortableRequest(async () => ++count))
    await waitFor(() => expect(result.current.data).toBe(1))

    act(() => result.current.reload())

    await waitFor(() => expect(result.current.data).toBe(2))
  })
})
