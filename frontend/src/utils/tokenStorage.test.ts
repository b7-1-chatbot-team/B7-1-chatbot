import { describe, expect, it, vi } from 'vitest'

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasAccessToken,
  saveTokens,
  subscribe,
} from './tokenStorage'

// setup.ts 가 테스트마다 localStorage 를 비운다

describe('tokenStorage — 저장·조회', () => {
  it('저장한 토큰을 그대로 읽는다', () => {
    saveTokens('access-1', 'refresh-1')

    expect(getAccessToken()).toBe('access-1')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('저장된 값이 없으면 null 을 반환한다', () => {
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('auth: 접두어 키로 저장한다', () => {
    saveTokens('access-1', 'refresh-1')

    expect(localStorage.getItem('auth:access_token')).toBe('access-1')
    expect(localStorage.getItem('auth:refresh_token')).toBe('refresh-1')
  })

  it('재발급처럼 다시 저장하면 두 토큰이 모두 교체된다', () => {
    saveTokens('access-1', 'refresh-1')
    saveTokens('access-2', 'refresh-2')

    expect(getAccessToken()).toBe('access-2')
    expect(getRefreshToken()).toBe('refresh-2')
  })

  it('clearTokens 는 두 토큰을 함께 지운다', () => {
    saveTokens('access-1', 'refresh-1')

    clearTokens()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('hasAccessToken 은 토큰 유무를 동기로 알려준다', () => {
    expect(hasAccessToken()).toBe(false)

    saveTokens('access-1', 'refresh-1')
    expect(hasAccessToken()).toBe(true)

    clearTokens()
    expect(hasAccessToken()).toBe(false)
  })
})

describe('tokenStorage — 변경 구독', () => {
  it('저장하면 구독자를 호출한다', () => {
    const listener = vi.fn()
    subscribe(listener)

    saveTokens('access-1', 'refresh-1')

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('삭제하면 구독자를 호출한다', () => {
    const listener = vi.fn()
    subscribe(listener)

    clearTokens()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('구독자가 여럿이면 모두 호출한다', () => {
    const first = vi.fn()
    const second = vi.fn()
    subscribe(first)
    subscribe(second)

    saveTokens('access-1', 'refresh-1')

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('해지하면 더 이상 호출하지 않는다', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    unsubscribe()
    saveTokens('access-1', 'refresh-1')

    expect(listener).not.toHaveBeenCalled()
  })

  it('다른 탭에서 토큰이 바뀌면(storage 이벤트) 구독자를 호출한다', () => {
    const listener = vi.fn()
    subscribe(listener)

    window.dispatchEvent(new StorageEvent('storage', { key: 'auth:access_token' }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('다른 탭에서 무관한 키가 바뀌면 호출하지 않는다', () => {
    const listener = vi.fn()
    subscribe(listener)

    window.dispatchEvent(new StorageEvent('storage', { key: 'ui:theme' }))

    expect(listener).not.toHaveBeenCalled()
  })

  it('해지하면 storage 이벤트도 더 이상 받지 않는다', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    unsubscribe()
    window.dispatchEvent(new StorageEvent('storage', { key: 'auth:access_token' }))

    expect(listener).not.toHaveBeenCalled()
  })
})
