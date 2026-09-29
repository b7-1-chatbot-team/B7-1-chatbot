import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { usePageMeta } from './usePageMeta'

const robots = () => document.querySelector('meta[name="robots"]')

afterEach(() => {
  robots()?.remove()
})

describe('usePageMeta', () => {
  it('탭 제목을 "화면 · Chatlog" 로 바꾼다', () => {
    renderHook(() => usePageMeta({ title: '로그인' }))
    expect(document.title).toBe('로그인 · Chatlog')
  })

  it('noindex 면 검색 제외 meta 를 넣고, 공개 화면으로 옮기면 뺀다', () => {
    const { rerender } = renderHook((props: { noindex: boolean }) => usePageMeta({ title: '챗', ...props }), {
      initialProps: { noindex: true },
    })
    expect(robots()?.getAttribute('content')).toBe('noindex, nofollow')

    rerender({ noindex: false })
    expect(robots()).toBeNull()
  })

  it('noindex 화면을 연달아 열어도 meta 는 하나다', () => {
    renderHook(() => usePageMeta({ title: '챗', noindex: true }))
    renderHook(() => usePageMeta({ title: '내 대화 로그', noindex: true }))
    expect(document.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
  })
})
