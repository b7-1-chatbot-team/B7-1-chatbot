import { Button } from '@/components/Button'
import type { ApiError } from '@/api/ApiError'

interface PagedFooterProps {
  hasMore: boolean
  isLoadingMore: boolean
  moreError: ApiError | null
  onLoadMore: () => void
}

/** [더 보기] 와 그 실패 안내. 실패해도 이미 받은 목록은 호출한 쪽이 그대로 둔다 */
export function PagedFooter({ hasMore, isLoadingMore, moreError, onLoadMore }: PagedFooterProps) {
  return (
    <>
      {moreError ? <p role="alert">더 불러오지 못했습니다. {moreError.message}</p> : null}
      {hasMore ? (
        <Button onClick={onLoadMore} isLoading={isLoadingMore} loadingLabel="불러오는 중…">
          더 보기
        </Button>
      ) : null}
    </>
  )
}
