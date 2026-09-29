import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { usePageMeta } from './usePageMeta'

const robots = () => document.querySelector('meta[name="robots"]')

const canonical = () => document.querySelector('link[rel="canonical"]')

afterEach(() => {
  document.head.querySelectorAll('meta[name="robots"], link[rel="canonical"], meta[property^="og:"]').forEach((el) => el.remove())
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

  it('공개 화면은 배포 주소 기준 canonical·og:url·og:title 을 넣는다', () => {
    window.history.pushState(null, '', '/login?from=mail')
    renderHook(() => usePageMeta({ title: '로그인' }))
    // 쿼리가 붙어 들어와도 대표 주소는 경로만
    expect(canonical()?.getAttribute('href')).toBe('https://chatlog.test/login')
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://chatlog.test/login')
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('로그인 · Chatlog')
  })

  it('검색 제외 화면에는 canonical 을 넣지 않는다', () => {
    window.history.pushState(null, '', '/chat')
    renderHook(() => usePageMeta({ title: '챗', noindex: true }))
    expect(canonical()).toBeNull()
  })
})
