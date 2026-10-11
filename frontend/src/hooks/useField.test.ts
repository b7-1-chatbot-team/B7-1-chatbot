import { act, renderHook } from '@testing-library/react'
import type { ChangeEvent } from 'react'
import { describe, expect, it } from 'vitest'

import { useField } from './useField'

/** 실제 input 이벤트 대신 최소 형태만 만든다 */
function changeEvent(value: string) {
  return { target: { value } } as ChangeEvent<HTMLInputElement>
}

const required = (message: string) => (value: string) => (value.trim() ? null : message)

describe('useField — 값 관리', () => {
  it('초기값을 그대로 쓴다', () => {
    const { result } = renderHook(() => useField({ initialValue: 'user@example.com' }))

    expect(result.current.value).toBe('user@example.com')
  })

  it('초기값을 주지 않으면 빈 문자열이다', () => {
    const { result } = renderHook(() => useField())

    expect(result.current.value).toBe('')
  })

  it('onChange 로 값이 바뀐다', () => {
    const { result } = renderHook(() => useField())

    act(() => result.current.onChange(changeEvent('입력값')))

    expect(result.current.value).toBe('입력값')
  })

  it('setValue 로 값을 직접 넣을 수 있다', () => {
    const { result } = renderHook(() => useField())

    act(() => result.current.setValue('가입에서 넘어온 이메일'))

    expect(result.current.value).toBe('가입에서 넘어온 이메일')
  })
})

describe('useField — 검증 시점', () => {
  it('터치 전에는 검증 오류를 보여주지 않는다', () => {
    const { result } = renderHook(() => useField({ validate: required('이메일을 입력해 주세요.') }))

    // 값이 비어 유효하지는 않지만, 아직 입력도 안 한 사용자에게 오류를 띄우지 않는다
    expect(result.current.isValid).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('포커스를 벗어난 뒤에는 오류를 보여준다', () => {
    const { result } = renderHook(() => useField({ validate: required('이메일을 입력해 주세요.') }))

    act(() => result.current.onBlur())

    expect(result.current.error).toBe('이메일을 입력해 주세요.')
  })

  it('값이 올바르면 터치 후에도 오류가 없다', () => {
    const { result } = renderHook(() => useField({ validate: required('이메일을 입력해 주세요.') }))

    act(() => {
      result.current.onChange(changeEvent('user@example.com'))
      result.current.onBlur()
    })

    expect(result.current.isValid).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('validate 를 주지 않으면 언제나 유효하다', () => {
    const { result } = renderHook(() => useField())

    act(() => result.current.onBlur())

    expect(result.current.isValid).toBe(true)
    expect(result.current.error).toBeNull()
  })
})

describe('useField — 서버 오류', () => {
  it('서버 오류는 터치 여부와 무관하게 바로 보여준다', () => {
    const { result } = renderHook(() => useField({ initialValue: 'user@example.com' }))

    act(() => result.current.setServerError('이미 가입된 이메일입니다.'))

    expect(result.current.error).toBe('이미 가입된 이메일입니다.')
  })

  it('값을 고치면 서버 오류가 사라진다', () => {
    const { result } = renderHook(() => useField({ initialValue: 'user@example.com' }))
    act(() => result.current.setServerError('이미 가입된 이메일입니다.'))

    act(() => result.current.onChange(changeEvent('other@example.com')))

    expect(result.current.error).toBeNull()
  })

  it('서버 오류가 검증 오류보다 먼저 보인다', () => {
    const { result } = renderHook(() => useField({ validate: required('입력해 주세요.') }))
    act(() => result.current.onBlur())
    expect(result.current.error).toBe('입력해 주세요.')

    act(() => result.current.setServerError('서버가 거절했습니다.'))

    expect(result.current.error).toBe('서버가 거절했습니다.')
  })
})

describe('useField — reset', () => {
  it('값·터치·서버 오류를 모두 초기 상태로 되돌린다', () => {
    const { result } = renderHook(() =>
      useField({ initialValue: '처음', validate: required('입력해 주세요.') }),
    )
    act(() => {
      result.current.onChange(changeEvent('바뀐 값'))
      result.current.onBlur()
      result.current.setServerError('서버 오류')
    })

    act(() => result.current.reset())

    expect(result.current.value).toBe('처음')
    expect(result.current.touched).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
