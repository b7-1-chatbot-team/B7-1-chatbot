import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from './Button'
import styles from './HistoryScroller.module.css'
import { LoadingStatus } from './Spinner'

/** 맨 위에서 이만큼 안쪽으로 들어오면 이전 기록을 불러온다 */
const TOP_THRESHOLD_PX = 40
/** 맨 아래에서 이만큼 안이면 "맨 아래를 보고 있다"고 본다 */
const BOTTOM_THRESHOLD_PX = 80

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
  /**
   * 새 항목이 붙을 때 보던 위치와 상관없이 맨 아래로 갈지.
   * 사용자가 방금 보낸 질문처럼 본인이 만든 항목이면 true. 기본은 false —
   * 위로 올려 읽는 중이면 따라 내려가지 않고 [새 메시지] 버튼을 띄운다
   */
  alwaysFollowLatest?: boolean
  /** 높이 상한 등 바깥 모양. 스크롤이 생기려면 높이가 정해져 있어야 한다 */
  className?: string
}

/**
 * 대화 기록 스크롤 영역 — 아래가 최신, 위로 올리면 이전 기록을 더 불러온다.
 *
 * - 처음 뜨면 맨 아래(최신)로 간다
 * - 맨 위에 닿으면 이전 기록을 불러온다. 더 없으면 아무것도 표시하지 않는다
 * - **이전 기록이 위에 붙어도 보던 위치를 유지한다.** 위에 내용이 늘어난 만큼 스크롤을
 *   내려 준다. 보정하지 않으면 붙는 순간 화면이 밀려 읽던 말풍선을 잃는다.
 *   브라우저 스크롤 앵커링은 끈다(CSS) — 켜 두면 브라우저와 이 코드가 두 번 내려 화면이 튄다
 * - 새 기록이 아래에 붙으면 맨 아래로 간다. **단 위로 올려 읽는 중이면 따라가지 않고**
 *   [새 메시지] 버튼을 띄운다. 읽던 곳에서 화면이 튀지 않게 한다
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
  alwaysFollowLatest = false,
  className,
}: HistoryScrollerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prev = useRef({ firstKey, lastKey, scrollHeight: 0 })
  // 마지막 스크롤 때 맨 아래를 보고 있었는가. 새 항목이 붙기 **전** 위치로 판단해야 한다
  const atBottom = useRef(true)
  const [hasUnseen, setHasUnseen] = useState(false)

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
      // 아래에 새 기록이 붙었다 — 맨 아래를 보던 중이거나 본인이 보낸 것이면 최신으로
      if (alwaysFollowLatest || atBottom.current) {
        element.scrollTop = element.scrollHeight
        atBottom.current = true
      } else {
        setHasUnseen(true)
      }
    }

    prev.current = { firstKey, lastKey, scrollHeight: element.scrollHeight }
    // alwaysFollowLatest 는 바뀐 순간의 값만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey, lastKey])

  const handleScroll = () => {
    const element = ref.current
    if (!element) return
    atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_THRESHOLD_PX
    if (atBottom.current) setHasUnseen(false)
    if (hasOlder && !isLoadingOlder && element.scrollTop <= TOP_THRESHOLD_PX) onReachTop()
  }

  const scrollToLatest = () => {
    const element = ref.current
    if (!element) return
    element.scrollTop = element.scrollHeight
    atBottom.current = true
    setHasUnseen(false)
  }

  // 기록이 적어 스크롤이 생기지 않으면 영역이 찰 때까지 이어서 불러온다.
  // 높이를 잴 수 없는 환경(clientHeight 0)에서는 하지 않는다 — 끝없이 불러오게 된다
  useEffect(() => {
    const element = ref.current
    if (!element || !hasOlder || isLoadingOlder || element.clientHeight === 0) return
    if (element.scrollHeight <= element.clientHeight) onReachTop()
  }, [firstKey, hasOlder, isLoadingOlder, onReachTop])

  return (
    <div className={`${styles.frame} ${className ?? ''}`}>
      <div
        ref={ref}
        className={styles.scroller}
        onScroll={handleScroll}
        aria-label={label}
        aria-busy={isLoadingOlder || undefined}
        // 키보드로도 스크롤할 수 있게 초점을 받는다
        tabIndex={0}
      >
        {children}
      </div>
      {/* 목록 위에 떠 있게 둔다. 내용 사이에 끼면 나타나고 사라질 때마다 보던 위치가 밀린다 */}
      {isLoadingOlder ? (
        <div className={styles.loadingOlder}>
          <LoadingStatus>이전 기록을 불러오는 중…</LoadingStatus>
        </div>
      ) : null}
      {hasUnseen ? (
        <Button size="sm" icon="arrowDown" className={styles.newMessage} onClick={scrollToLatest}>
          새 메시지
        </Button>
      ) : null}
    </div>
  )
}
