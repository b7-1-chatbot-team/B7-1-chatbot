import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/ApiError'
import { RESULT_CODE } from '@/api/types'
import { useSubmit } from './useSubmit'

describe('useSubmit — 성공', () => {
  it('ok:true 와 결과를 함께 돌려준다', async () => {
    const action = vi.fn(async (value: string) => `결과:${value}`)
    const { result } = renderHook(() => useSubmit(action))

    let returned: Awaited<ReturnType<typeof result.current.submit>> | undefined
    await act(async () => {
      returned = await result.current.submit('입력')
    })

    expect(returned).toEqual({ ok: true, data: '결과:입력' })
    expect(action).toHaveBeenCalledWith('입력')
    expect(result.current.error).toBeNull()
  })

  it('반환 타입이 void 인 작업도 ok 로 성공을 구분할 수 있다', async () => {
    const action = vi.fn(async () => undefined)
    const { result } = renderHook(() => useSubmit(action))

    let returned: Awaited<ReturnType<typeof result.current.submit>> | undefined
    await act(async () => {
      returned = await result.current.submit()
    })

    // data 가 undefined 여도 ok 로 성공임이 드러난다
    expect(returned?.ok).toBe(true)
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

    let second: Awaited<ReturnType<typeof result.current.submit>> | undefined
    await act(async () => {
      void result.current.submit()
      // 상태 갱신을 기다리지 않고 곧바로 다시 누른 상황
      second = await result.current.submit()
    })

    expect(action).toHaveBeenCalledTimes(1)
    // 오류가 아니라 무시된 것이므로 error 는 비어 있다
    expect(second).toEqual({ ok: false, error: null })

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
  it('ApiError 는 반환값과 상태 양쪽에 담는다', async () => {
    const action = vi.fn(async () => {
      throw new ApiError(RESULT_CODE.conflict, '이미 가입된 이메일입니다.')
    })
    const { result } = renderHook(() => useSubmit(action))

    let returned: Awaited<ReturnType<typeof result.current.submit>> | undefined
    await act(async () => {
      returned = await result.current.submit()
    })

    expect(returned?.ok).toBe(false)
    // 반환값으로 바로 받을 수 있어야 이전 렌더의 상태를 보지 않는다
    expect(returned?.ok === false && returned.error?.code).toBe(RESULT_CODE.conflict)
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
