import { useCallback, useState } from 'react'

import { getMyChats } from '@/api/logs'
import type { ChatLogItem, ChatLogList } from '@/api/types'
import { useAbortableRequest } from '@/hooks/useAbortableRequest'
import { useSubmit } from '@/hooks/useSubmit'

/** 한 번에 불러올 개수 (docs/05-ui-ux.md 화면 4, 서버 기본값과 같다) */
export const PAGE_SIZE = 20

/**
 * 내 대화 로그 — 첫 페이지와 [더 보기].
 *
 * 첫 페이지는 화면이 뜰 때 불러오고 화면을 벗어나면 취소한다.
 * [더 보기] 는 이미 받은 개수만큼 offset 을 올려 이어 붙이고, useSubmit 으로 잠가
 * 두 번 눌러도 한 번만 나간다.
 */
export function useChatLogs() {
  const first = useAbortableRequest((signal) => getMyChats({ limit: PAGE_SIZE, offset: 0 }, signal))
  const [more, setMore] = useState<ChatLogItem[]>([])
  const [latestTotal, setLatestTotal] = useState<number | null>(null)
  const loadMore = useSubmit((offset: number) => getMyChats({ limit: PAGE_SIZE, offset }))

  const items = dedupe([...(first.data?.items ?? []), ...more])
  // 더 보기 도중 새 대화가 생기면 total 도 늘어난다. 가장 최근에 받은 값을 쓴다
  const total = latestTotal ?? first.data?.total ?? 0

  const fetchMore = useCallback(async () => {
    // 받은 "원본" 개수로 offset 을 정한다. 중복을 거른 개수를 쓰면 같은 구간을 다시 받는다
    const received = (first.data?.items.length ?? 0) + more.length
    const result = await loadMore.submit(received)
    if (!result.ok) return
    const page: ChatLogList = result.data
    setMore((prev) => [...prev, ...page.items])
    setLatestTotal(page.total)
  }, [first.data, more.length, loadMore])

  return {
    items,
    total,
    isLoading: first.isPending,
    loadError: first.error,
    retry: first.reload,
    hasMore: first.data !== null && (first.data.items.length + more.length) < total,
    fetchMore,
    isFetchingMore: loadMore.isSubmitting,
    moreError: loadMore.error,
  }
}

/**
 * chat_id 로 중복을 거른다.
 *
 * 로그는 최신순이라, 보는 도중 챗에서 새 대화가 생기면 모든 기록이 한 칸씩 밀린다.
 * 그러면 다음 페이지의 첫 항목이 이미 받은 마지막 항목과 같아진다.
 */
function dedupe(items: ChatLogItem[]): ChatLogItem[] {
  const seen = new Set<number>()
  return items.filter((item) => {
    if (seen.has(item.chat_id)) return false
    seen.add(item.chat_id)
    return true
  })
}
