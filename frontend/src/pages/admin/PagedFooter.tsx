import { useEffect, useRef } from 'react'

import type { ApiError } from '@/api/ApiError'
import { Button } from '@/components/Button'
import { useToast } from '@/hooks/useToast'
import styles from './Admin.module.css'

interface PagedFooterProps {
  hasMore: boolean
  isLoadingMore: boolean
  moreError: ApiError | null
  onLoadMore: () => void
}

/**
 * [더 보기]. 더 불러오지 못하면 토스트로 알린다 — 이미 받은 목록은 그대로 두고 흐름을 막지 않는다.
 * onLoadMore 는 렌더마다 새로 만들어져, 의존성에 넣으면 렌더마다 같은 토스트가 뜬다. ref 로 본다
 */
export function PagedFooter({ hasMore, isLoadingMore, moreError, onLoadMore }: PagedFooterProps) {
  const showToast = useToast()
  const loadMoreRef = useRef(onLoadMore)
  useEffect(() => {
    loadMoreRef.current = onLoadMore
  })
  useEffect(() => {
    if (!moreError) return
    showToast(`더 불러오지 못했습니다. ${moreError.message}`, {
      tone: 'error',
      action: { label: '다시 불러오기', onClick: () => loadMoreRef.current() },
    })
  }, [moreError, showToast])

  if (!hasMore) return null
  return (
    <div className={styles.more}>
      <Button size="sm" onClick={onLoadMore} isLoading={isLoadingMore} loadingLabel="불러오는 중…">
        더 보기
      </Button>
    </div>
  )
}
