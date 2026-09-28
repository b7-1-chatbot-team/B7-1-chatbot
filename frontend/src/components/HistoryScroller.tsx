import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** 맨 위에서 이만큼 안쪽으로 들어오면 이전 기록을 불러온다 */
const TOP_THRESHOLD_PX = 40

interface HistoryScrollerProps {
  children: ReactNode
  label: string
  /** 맨 위 항목의 key. 바뀌면 위에 이전 기록이 붙은 것이다 */
  firstKey: string | number | undefined
  /** 맨 아래 항목의 key. 바뀌면 새 기록이 아래에 붙은 것이다 */
  lastKey: string | number | undefined
  hasOlder: boolean
  isLoadingOlder: boolean
  onReachTop: () => void
}

/**
 * 대화 기록 스크롤 영역 — 아래가 최신, 위로 올리면 이전 기록을 더 불러온다.
 *
 * - 처음 뜨면 맨 아래(최신)로 간다
 * - 맨 위에 닿으면 이전 기록을 불러온다. 더 없으면 아무것도 표시하지 않는다
 * - **이전 기록이 위에 붙어도 보던 위치를 유지한다.** 위에 내용이 늘어난 만큼 스크롤을
 *   내려 준다. 보정하지 않으면 붙는 순간 화면이 밀려 읽던 말풍선을 잃는다
 * - 새 기록이 아래에 붙으면 맨 아래로 간다
 * - 기록이 적어 스크롤이 생기지 않으면 맨 위에 닿을 방법이 없으므로, 영역이 찰 때까지
 *   이전 기록을 이어서 불러온다
 */
export function HistoryScroller({
  children,
  label,
  firstKey,
  lastKey,
  hasOlder,
  isLoadingOlder,
  onReachTop,
}: HistoryScrollerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prev = useRef({ firstKey, lastKey, scrollHeight: 0 })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const before = prev.current

    if (before.firstKey === undefined && firstKey !== undefined) {
      // 처음 채워졌다 — 최신(맨 아래)으로
      element.scrollTop = element.scrollHeight
    } else if (firstKey !== before.firstKey && lastKey === before.lastKey) {
      // 위에 이전 기록이 붙었다 — 늘어난 높이만큼 내려 보던 위치를 지킨다
      element.scrollTop += element.scrollHeight - before.scrollHeight
    } else if (lastKey !== before.lastKey) {
      // 아래에 새 기록이 붙었다 — 최신으로
      element.scrollTop = element.scrollHeight
    }

    prev.current = { firstKey, lastKey, scrollHeight: element.scrollHeight }
  }, [firstKey, lastKey])

  const tryLoadOlder = () => {
    const element = ref.current
    if (!element || !hasOlder || isLoadingOlder) return
    if (element.scrollTop <= TOP_THRESHOLD_PX) onReachTop()
  }

  // 기록이 적어 스크롤이 생기지 않으면 영역이 찰 때까지 이어서 불러온다.
  // 높이를 잴 수 없는 환경(clientHeight 0)에서는 하지 않는다 — 끝없이 불러오게 된다
  useEffect(() => {
    const element = ref.current
    if (!element || !hasOlder || isLoadingOlder || element.clientHeight === 0) return
    if (element.scrollHeight <= element.clientHeight) onReachTop()
  }, [firstKey, hasOlder, isLoadingOlder, onReachTop])

  return (
    <div
      ref={ref}
      onScroll={tryLoadOlder}
      aria-label={label}
      aria-busy={isLoadingOlder || undefined}
      // 스크롤이 생기려면 높이 상한이 있어야 한다. 모양은 스타일링 단계에서 다듬는다
      style={{ maxHeight: '60vh', overflowY: 'auto' }}
      // 키보드로도 스크롤할 수 있게 초점을 받는다
      tabIndex={0}
    >
      {isLoadingOlder ? <p role="status">이전 기록을 불러오는 중…</p> : null}
      {children}
    </div>
  )
}
