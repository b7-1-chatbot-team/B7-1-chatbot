import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/Button'
import { usePageMeta } from '@/hooks/usePageMeta'
import styles from './Admin.module.css'
import { FailureList } from './FailureList'
import { RequestFlow } from './RequestFlow'
import { StatsCards } from './StatsCards'
import { UserChats } from './UserChats'
import { isStackedLayout } from './layout'
import { UserList } from './UserList'

type Tab = 'users' | 'failures'

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: '사용자' },
  { id: 'failures', label: 'AI 실패 기록' },
]

/**
 * 관리자 화면 (docs/05-ui-ux.md 화면 5).
 *
 * 평가자가 사용자별 대화와 AI 실패 원인을 브라우저에서 추적하는 곳이다.
 * 권한은 RequireAdmin 이 화면을, 서버 require_admin 이 데이터를 막는다.
 *
 * 선택 상태(탭·사용자·요청)는 URL 쿼리에 둔다. 새로고침하거나 주소를 공유해도 같은 화면이 나온다.
 * [새로고침] 은 전체를 key 로 새로 그린다 — 통계와 목록을 함께 다시 불러온다.
 */
export default function AdminPage() {
  usePageMeta({ title: '관리자', noindex: true })
  const [version, setVersion] = useState(0)
  const [params, setParams] = useSearchParams()

  const tab: Tab = params.get('tab') === 'failures' ? 'failures' : 'users'
  const userParam = Number(params.get('user'))
  const selectedUser = Number.isInteger(userParam) && userParam > 0 ? userParam : null
  const requestId = params.get('request')

  // 태블릿·모바일에서 사용자 목록을 접었는가. 사용자를 고른 채로 들어오면(새로고침·공유 주소) 접힌 채로 시작
  const [listCollapsed, setListCollapsed] = useState(() => selectedUser !== null && isStackedLayout())
  // 고른 뒤 대화로 옮겨 갈지 — 새 대화 패널이 그려진 다음에 옮긴다
  const moveToChats = useRef(false)
  useEffect(() => {
    if (!moveToChats.current || selectedUser === null) return
    moveToChats.current = false
    const title = document.getElementById('admin-user-chats-title')
    title?.scrollIntoView({ block: 'start' })
    title?.focus({ preventScroll: true })
  }, [selectedUser])

  const selectUser = (id: number) => {
    update({ user: String(id), request: null })
    // 목록 아래에 대화가 붙는 화면에서는 목록을 접고 대화로 옮겨 간다 — 긴 목록을 지나 내려가지 않게
    if (isStackedLayout()) {
      setListCollapsed(true)
      moveToChats.current = true
    }
  }

  /** 바꿀 값만 넘긴다. null 은 지운다 */
  const update = (changes: Record<string, string | null>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }

  const openRequest = (id: string) => update({ request: id })

  const selectTab = (id: Tab) => update({ tab: id === 'users' ? null : id, request: null })

  // ARIA 탭 패턴: 방향키·Home·End 로 탭 사이를 옮기고 바로 고른다. Tab 키는 탭 목록을 한 번에 지나간다
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})
  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex(({ id }) => id === tab)
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    selectTab(TABS[next].id)
    tabRefs.current[TABS[next].id]?.focus()
  }

  return (
    <section className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>관리자</h1>
        <Button icon="refresh" label="새로고침" onClick={() => setVersion((v) => v + 1)} />
      </div>

      <div key={version} className={styles.page}>
        <StatsCards />

        <div role="tablist" aria-label="관리자 보기" className={styles.tabs}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              ref={(element) => {
                tabRefs.current[id] = element
              }}
              id={`admin-tab-${id}`}
              type="button"
              role="tab"
              className={styles.tab}
              aria-selected={tab === id}
              aria-controls={`admin-panel-${id}`}
              // 선택된 탭만 Tab 순서에 넣는다. 나머지는 방향키로 간다
              tabIndex={tab === id ? 0 : -1}
              onClick={() => selectTab(id)}
              onKeyDown={handleTabKey}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' ? (
          <div role="tabpanel" id="admin-panel-users" aria-labelledby="admin-tab-users" className={styles.grid}>
            <UserList
              selectedId={selectedUser}
              onSelect={selectUser}
              collapsed={listCollapsed}
              onToggleCollapsed={() => setListCollapsed((value) => !value)}
            />
            {selectedUser ? (
              <UserChats key={selectedUser} userId={selectedUser} onOpenRequest={openRequest} />
            ) : (
              <p className={`${styles.panel} ${styles.muted}`}>목록에서 사용자를 선택하면 대화 기록이 보입니다.</p>
            )}
          </div>
        ) : (
          <div role="tabpanel" id="admin-panel-failures" aria-labelledby="admin-tab-failures">
            <FailureList onOpenRequest={openRequest} />
          </div>
        )}

        {requestId ? <RequestFlow requestId={requestId} onClose={() => update({ request: null })} /> : null}
      </div>
    </section>
  )
}
