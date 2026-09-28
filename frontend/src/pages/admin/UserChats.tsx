import { getAdminUserChats } from '@/api/admin'
import { usePagedList } from '@/hooks/usePagedList'
import { ChatRecord } from './ChatRecord'
import { LoadError } from './LoadError'
import { PagedFooter } from './PagedFooter'

interface UserChatsProps {
  userId: number
  onOpenRequest: (requestId: string) => void
}

/**
 * 선택한 사용자의 대화 (docs/03-api.md 4-3절) — 성공·실패 모두 최신순.
 * 사용자가 바뀌면 호출한 쪽이 key 로 새로 그린다.
 */
export function UserChats({ userId, onOpenRequest }: UserChatsProps) {
  const list = usePagedList(
    (page, signal) => getAdminUserChats(userId, page, signal),
    (chat) => chat.chat_id,
  )
  const user = list.firstPage?.user

  return (
    <section aria-labelledby="admin-user-chats-title">
      <h2 id="admin-user-chats-title">{user ? `${user.email} 의 대화 (${list.total})` : '사용자의 대화'}</h2>
      {list.loadError ? (
        <LoadError what="대화 기록" error={list.loadError} onRetry={list.retry} />
      ) : list.isLoading ? (
        <p role="status">불러오는 중…</p>
      ) : list.items.length === 0 ? (
        <p>대화 기록이 없습니다.</p>
      ) : (
        <>
          <ol aria-label="사용자 대화">
            {list.items.map((chat) => (
              <li key={chat.chat_id}>
                <ChatRecord chat={chat} onOpenRequest={onOpenRequest} />
              </li>
            ))}
          </ol>
          <PagedFooter
            hasMore={list.hasMore}
            isLoadingMore={list.isLoadingMore}
            moreError={list.moreError}
            onLoadMore={list.loadMore}
          />
        </>
      )}
    </section>
  )
}
