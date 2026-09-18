import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/ApiError'
import { RESULT_CODE } from '@/api/types'
import { useSubmit } from './useSubmit'

describe('useSubmit — 성공', () => {
  it('결과를 그대로 돌려준다', async () => {
    const action = vi.fn(async (value: string) => `결과:${value}`)
    const { result } = renderHook(() => useSubmit(action))

    let returned: string | undefined
    await act(async () => {
      returned = await result.current.submit('입력')
    })

    expect(returned).toBe('결과:입력')
    expect(action).toHaveBeenCalledWith('입력')
    expect(result.current.error).toBeNull()
  })

  it('진행 중에는 isSubmitting 이 true 다', async () => {
    let finish: (() => void) | undefined
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const { result } = renderHook(() => useSubmit(action))

    act(() => {
      void result.current.submit()
    })
    await waitFor(() => expect(result.current.isSubmitting).toBe(true))

    await act(async () => {
      finish?.()
    })

    expect(result.current.isSubmitting).toBe(false)
  })
})

describe('useSubmit — 중복 제출', () => {
  it('진행 중에 다시 부르면 실행하지 않는다', async () => {
    let finish: (() => void) | undefined
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const { result } = renderHook(() => useSubmit(action))

    let second: unknown = 'not-run'
    await act(async () => {
      void result.current.submit()
      // 상태 갱신을 기다리지 않고 곧바로 다시 누른 상황
      second = await result.current.submit()
    })

    expect(action).toHaveBeenCalledTimes(1)
    expect(second).toBeUndefined()

    await act(async () => {
      finish?.()
    })
  })

  it('끝난 뒤에는 다시 제출할 수 있다', async () => {
    const action = vi.fn(async () => 'ok')
    const { result } = renderHook(() => useSubmit(action))

    await act(async () => {
      await result.current.submit()
    })
    await act(async () => {
      await result.current.submit()
    })

    expect(action).toHaveBeenCalledTimes(2)
  })
})

describe('useSubmit — 오류', () => {
  it('ApiError 는 보관하고 undefined 를 돌려준다', async () => {
    const action = vi.fn(async () => {
      throw new ApiError(RESULT_CODE.conflict, '이미 가입된 이메일입니다.')
    })
    const { result } = renderHook(() => useSubmit(action))

    let returned: unknown = 'not-set'
    await act(async () => {
      returned = await result.current.submit()
    })

    expect(returned).toBeUndefined()
    expect(result.current.error?.code).toBe(RESULT_CODE.conflict)
    expect(result.current.error?.message).toBe('이미 가입된 이메일입니다.')
    expect(result.current.isSubmitting).toBe(false)
  })

  it('다시 제출하면 이전 오류를 지운다', async () => {
    let shouldFail = true
    const action = vi.fn(async () => {
      if (shouldFail) throw new ApiError(RESULT_CODE.unauthorized, '실패')
      return 'ok'
    })
    const { result } = renderHook(() => useSubmit(action))

    await act(async () => {
      await result.current.submit()
    })
    expect(result.current.error).not.toBeNull()

    shouldFail = false
    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.error).toBeNull()
  })

  it('reset 으로 오류를 지울 수 있다', async () => {
    const action = vi.fn(async () => {
      throw new ApiError(RESULT_CODE.internalError, '서버 오류')
    })
    const { result } = renderHook(() => useSubmit(action))
    await act(async () => {
      await result.current.submit()
    })

    act(() => result.current.reset())

    expect(result.current.error).toBeNull()
  })

  it('ApiError 가 아닌 오류는 삼키지 않고 그대로 던진다', async () => {
    const action = vi.fn(async () => {
      throw new TypeError('코드 결함')
    })
    const { result } = renderHook(() => useSubmit(action))

    await expect(
      act(async () => {
        await result.current.submit()
      }),
    ).rejects.toThrow('코드 결함')
  })
})
