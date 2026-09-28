import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HistoryScroller } from './HistoryScroller'

/** 테스트 환경에는 실제 레이아웃이 없어 높이를 직접 정한다 */
function setHeights(element: HTMLElement, heights: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => heights.scrollHeight })
  Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => heights.clientHeight })
}

function renderScroller(props: Partial<Parameters<typeof HistoryScroller>[0]> = {}) {
  const onReachTop = vi.fn()
  const view = (p: Partial<Parameters<typeof HistoryScroller>[0]>) => (
    <HistoryScroller
      label="기록"
      firstKey={undefined}
      lastKey={undefined}
      hasOlder={false}
      isLoadingOlder={false}
      onReachTop={onReachTop}
      {...props}
      {...p}
    >
      <p>내용</p>
    </HistoryScroller>
  )
  const result = render(view({}))
  return { ...result, onReachTop, rerender: (p: Partial<Parameters<typeof HistoryScroller>[0]>) => result.rerender(view(p)) }
}

describe('HistoryScroller', () => {
  it('이전 기록이 위에 붙어도 보던 위치를 지킨다 (늘어난 높이만큼 내린다)', () => {
    const { rerender } = renderScroller()
    const element = screen.getByLabelText('기록')
    const heights = { scrollHeight: 1000, clientHeight: 400 }
    setHeights(element, heights)

    // 처음 채워짐 → 맨 아래
    rerender({ firstKey: 11, lastKey: 30 })
    expect(element.scrollTop).toBe(1000)

    // 사용자가 맨 위까지 올려 읽는 중
    element.scrollTop = 0

    // 위에 이전 기록이 붙어 높이가 600 늘었다
    heights.scrollHeight = 1600
    rerender({ firstKey: 1, lastKey: 30 })

    // 보던 첫 줄이 그대로 보이도록 600 만큼 내려와 있어야 한다
    expect(element.scrollTop).toBe(600)
  })

  it('아래에 새 기록이 붙으면 맨 아래(최신)로 간다', () => {
    const { rerender } = renderScroller({ firstKey: 1, lastKey: 30 })
    const element = screen.getByLabelText('기록')
    const heights = { scrollHeight: 1000, clientHeight: 400 }
    setHeights(element, heights)
    element.scrollTop = 200

    heights.scrollHeight = 1100
    rerender({ firstKey: 1, lastKey: 31 })

    expect(element.scrollTop).toBe(1100)
  })

  it('기록이 적어 스크롤이 생기지 않으면 이전 기록을 이어서 불러온다', () => {
    const { rerender, onReachTop } = renderScroller()
    const element = screen.getByLabelText('기록')
    setHeights(element, { scrollHeight: 300, clientHeight: 400 })

    rerender({ firstKey: 1, lastKey: 5, hasOlder: true })

    expect(onReachTop).toHaveBeenCalled()
  })

  it('더 불러올 게 없으면 아무것도 표시하지 않는다', () => {
    renderScroller({ firstKey: 1, lastKey: 5, hasOlder: false })

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('불러오는 중에는 안내를 보여준다', () => {
    renderScroller({ firstKey: 1, lastKey: 5, hasOlder: true, isLoadingOlder: true })

    expect(screen.getByRole('status')).toHaveTextContent('이전 기록을 불러오는 중')
  })
})

describe('HistoryScroller — 마지막 항목이 제자리에서 바뀔 때', () => {
  it('lastKey 가 바뀌면 같은 항목이 커져도 맨 아래로 따라간다', () => {
    const { rerender } = renderScroller({ firstKey: 1, lastKey: 'a-9:pending' })
    const element = screen.getByLabelText('기록')
    const heights = { scrollHeight: 1000, clientHeight: 400 }
    setHeights(element, heights)
    element.scrollTop = 600

    // 응답 대기 자리가 긴 답으로 바뀌었다
    heights.scrollHeight = 1300
    rerender({ firstKey: 1, lastKey: 'a-9:bot' })

    expect(element.scrollTop).toBe(1300)
  })
})
