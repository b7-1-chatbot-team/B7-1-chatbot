import { useState } from 'react'

import { getAdminUsers } from '@/api/admin'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagedList } from '@/hooks/usePagedList'
import { formatDateTime } from '@/utils/datetime'
import { LoadError } from './LoadError'
import { PagedFooter } from './PagedFooter'

/** 검색어 입력이 멈추고 요청하기까지 (docs/05-ui-ux.md 화면 5) */
export const SEARCH_DEBOUNCE_MS = 300

interface UserListProps {
  selectedId: number | null
  onSelect: (userId: number) => void
}

/**
 * 사용자 목록 · 이메일 검색 (docs/03-api.md 4-2절).
 *
 * 검색어가 바뀌면 목록을 key 로 새로 그린다. 이전 검색의 [더 보기] 결과가 섞이지 않는다.
 * 검색어는 입력이 멈춘 뒤 300ms 에 반영해 글자마다 요청하지 않는다.
 */
export function UserList({ selectedId, onSelect }: UserListProps) {
  const [query, setQuery] = useState('')
  const q = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)

  return (
    <section aria-labelledby="admin-users-title">
      <h2 id="admin-users-title">사용자 목록</h2>
      <label>
        이메일 검색 <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <UserListResult key={q} q={q} selectedId={selectedId} onSelect={onSelect} />
    </section>
  )
}

function UserListResult({ q, selectedId, onSelect }: UserListProps & { q: string }) {
  const list = usePagedList(
    (page, signal) => getAdminUsers({ q, ...page }, signal),
    (user) => user.id,
  )

  if (list.loadError) return <LoadError what="사용자 목록" error={list.loadError} onRetry={list.retry} />
  if (list.isLoading) return <p role="status">불러오는 중…</p>
  if (list.items.length === 0) {
    return <p>{q ? `"${q}" 에 해당하는 사용자가 없습니다.` : '사용자가 없습니다.'}</p>
  }

  return (
    <>
      <p>
        <span aria-label="사용자 수">{list.total}</span>명
      </p>
      <ul aria-label="사용자">
        {list.items.map((user) => (
          <li key={user.id}>
            <button type="button" aria-pressed={user.id === selectedId} onClick={() => onSelect(user.id)}>
              {user.email}
              {user.role === 'admin' ? ' (관리자)' : ''} · {user.chat_count}건
              {user.last_chat_at ? ` · ${formatDateTime(user.last_chat_at)}` : ''}
            </button>
          </li>
        ))}
      </ul>
      <PagedFooter
        hasMore={list.hasMore}
        isLoadingMore={list.isLoadingMore}
        moreError={list.moreError}
        onLoadMore={list.loadMore}
      />
    </>
  )
}
