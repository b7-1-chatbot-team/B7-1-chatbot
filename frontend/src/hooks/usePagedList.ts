import { useCallback, useMemo, useState } from 'react'

import type { PageResult } from '@/api/types'
import { useAbortableRequest } from '@/hooks/useAbortableRequest'
import { useSubmit } from '@/hooks/useSubmit'

export const PAGE_SIZE = 20

/**
 * 최신순 목록을 [더 보기] 로 이어 붙인다 — 관리자 화면의 사용자·대화·실패 목록.
 *
 * 조건(검색어, 선택한 사용자)이 바뀌면 호출한 쪽이 **컴포넌트 key 를 바꿔** 새로 시작한다.
 * 받아 둔 페이지·오류·진행 상태를 하나씩 초기화하다 빠뜨리는 일을 막는다.
 *
 * - offset 은 거르기 전 원본 개수. 거른 개수를 쓰면 같은 구간을 다시 받는다
 * - 보는 도중 새 기록이 생기면 목록이 밀려 겹치므로 getKey 로 중복을 거른다
 * - [더 보기] 는 useSubmit 으로 잠가 두 번 눌러도 한 번만 요청하고, 실패해도 받은 목록은 둔다
 */
export function usePagedList<Page extends PageResult<unknown>>(
  fetchPage: (page: { limit: number; offset: number }, signal?: AbortSignal) => Promise<Page>,
  getKey: (item: Page['items'][number]) => string | number,
) {
  type Item = Page['items'][number]
  const first = useAbortableRequest((signal) => fetchPage({ limit: PAGE_SIZE, offset: 0 }, signal))
  const [more, setMore] = useState<Item[]>([])
  const [latestTotal, setLatestTotal] = useState<number | null>(null)
  const moreRequest = useSubmit((offset: number) => fetchPage({ limit: PAGE_SIZE, offset }))

  const received = (first.data?.items.length ?? 0) + more.length
  const total = latestTotal ?? first.data?.total ?? 0

  const items = useMemo<Item[]>(() => {
    const seen = new Set<string | number>()
    const all: Item[] = [...(first.data?.items ?? []), ...more]
    return all.filter((item) => {
      const key = getKey(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    // getKey 는 보통 인라인 함수라 넣지 않는다. 같은 목록에서 규칙이 바뀌지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first.data, more])

  const loadMore = useCallback(async () => {
    const result = await moreRequest.submit(received)
    if (!result.ok) return
    setMore((prev) => [...prev, ...result.data.items])
    setLatestTotal(result.data.total)
  }, [moreRequest, received])

  return {
    /** 첫 페이지 응답 전체 — 목록 외 정보(선택한 사용자 등)를 쓸 때 */
    firstPage: first.data,
    items,
    total,
    isLoading: first.isPending,
    loadError: first.error,
    retry: first.reload,
    hasMore: first.data !== null && received < total,
    loadMore,
    isLoadingMore: moreRequest.isSubmitting,
    moreError: moreRequest.error,
  }
}
