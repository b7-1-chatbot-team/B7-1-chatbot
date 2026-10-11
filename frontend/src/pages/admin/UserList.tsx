import { useState } from 'react'

import { getAdminUsers } from '@/api/admin'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagedList } from '@/hooks/usePagedList'
import { Button } from '@/components/Button'
import { LoadingStatus } from '@/components/Spinner'
import { formatListTime } from '@/utils/datetime'
import styles from './Admin.module.css'
import { LoadError } from './LoadError'
import { isStackedLayout, USER_PAGE_SIZE } from './layout'
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
 * 서버가 **최근 활동 순**으로 준다. 가입만 하고 쓰지 않는 계정보다 지금 쓰는 사용자를 먼저 본다.
 * 활동 순은 누가 대화할 때마다 바뀌므로, 보는 도중 순서가 바뀐 것은 자동으로 따라가지 않고
 * [목록 새로고침] 으로 관리자가 직접 다시 불러온다. 그 사이 [더 보기] 의 중복은 키로 거른다.
 *
 * 검색어가 바뀌거나 새로고침하면 목록을 key 로 새로 그린다. 이전 목록의 [더 보기] 결과가 섞이지 않는다.
 * 검색어는 입력이 멈춘 뒤 300ms 에 반영해 글자마다 요청하지 않는다.
 */
export function UserList({
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapsed,
}: UserListProps & { collapsed: boolean; onToggleCollapsed: () => void }) {
  const [query, setQuery] = useState('')
  const [version, setVersion] = useState(0)
  const q = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)
  // 처음 화면 폭으로 정한다. 도중에 폭이 바뀌어도 받아 둔 목록의 offset 이 어긋나지 않게 고정
  const [pageSize] = useState(() => (isStackedLayout() ? USER_PAGE_SIZE.stacked : USER_PAGE_SIZE.wide))

  return (
    <section aria-labelledby="admin-users-title" className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.panelHead}>
        <h2 id="admin-users-title" className={styles.panelTitle}>
          사용자 목록
        </h2>
        {/* 태블릿·모바일에서만 보인다. PC 는 목록과 대화가 나란히 있어 접을 필요가 없다 */}
        <Button
          size="sm"
          variant="ghost"
          className={styles.listToggle}
          aria-expanded={!collapsed}
          aria-controls="admin-users-body"
          onClick={onToggleCollapsed}
        >
          {collapsed ? '목록 펼치기' : '목록 접기'}
        </Button>
      </div>
      {/* 접어도 지우지 않고 숨긴다 — 검색어와 [더 보기] 로 받은 목록을 그대로 둔다 */}
      <div id="admin-users-body" className={styles.listBody}>
      <div className={styles.tools}>
        {/* 안내문이 이름을 보여 주므로 라벨은 스크린리더용 */}
        <label htmlFor="admin-user-search" className="visually-hidden">
          이메일 검색
        </label>
        <input
          id="admin-user-search"
          type="search"
          className={styles.search}
          placeholder="이메일 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button size="sm" icon="refresh" label="목록 새로고침" onClick={() => setVersion((v) => v + 1)} />
      </div>
      <UserListResult
        key={`${q}:${version}`}
        q={q}
        selectedId={selectedId}
        onSelect={onSelect}
        pageSize={pageSize}
      />
      </div>
    </section>
  )
}

function UserListResult({ q, selectedId, onSelect, pageSize }: UserListProps & { q: string; pageSize: number }) {
  const list = usePagedList(
    (page, signal) => getAdminUsers({ q, ...page }, signal),
    (user) => user.id,
    pageSize,
  )

  if (list.loadError) return <LoadError what="사용자 목록" error={list.loadError} onRetry={list.retry} />
  if (list.isLoading) return <LoadingStatus>불러오는 중…</LoadingStatus>
  if (list.items.length === 0) {
    return <p className={styles.muted}>{q ? `"${q}" 에 해당하는 사용자가 없습니다.` : '사용자가 없습니다.'}</p>
  }

  return (
    <>
      <p className={styles.count}>
        <span aria-label="사용자 수">{list.total}</span>명 · 최근 활동 순
      </p>
      <ul aria-label="사용자" className={styles.users}>
        {list.items.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              className={styles.user}
              aria-pressed={user.id === selectedId}
              onClick={() => onSelect(user.id)}
            >
              <span className={styles.email} title={user.email}>
                {user.email}
              </span>
              {user.role === 'admin' ? <span className={styles.chip}>관리자</span> : <span />}
              <span className={styles.meta}>
                {user.chat_count}건 · {user.last_chat_at ? formatListTime(user.last_chat_at) : '대화 없음'}
              </span>
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
