import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/Button'
import styles from './Admin.module.css'
import { FailureList } from './FailureList'
import { RequestFlow } from './RequestFlow'
import { StatsCards } from './StatsCards'
import { UserChats } from './UserChats'
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
  const [version, setVersion] = useState(0)
  const [params, setParams] = useSearchParams()

  const tab: Tab = params.get('tab') === 'failures' ? 'failures' : 'users'
  const userParam = Number(params.get('user'))
  const selectedUser = Number.isInteger(userParam) && userParam > 0 ? userParam : null
  const requestId = params.get('request')

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
              type="button"
              role="tab"
              className={styles.tab}
              aria-selected={tab === id}
              onClick={() => update({ tab: id === 'users' ? null : id, request: null })}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' ? (
          <div role="tabpanel" aria-label="사용자" className={styles.grid}>
            <UserList
              selectedId={selectedUser}
              onSelect={(id) => update({ user: String(id), request: null })}
            />
            {selectedUser ? (
              <UserChats key={selectedUser} userId={selectedUser} onOpenRequest={openRequest} />
            ) : (
              <p className={`${styles.panel} ${styles.muted}`}>목록에서 사용자를 선택하면 대화 기록이 보입니다.</p>
            )}
          </div>
        ) : (
          <div role="tabpanel" aria-label="AI 실패 기록">
            <FailureList onOpenRequest={openRequest} />
          </div>
        )}

        {requestId ? <RequestFlow requestId={requestId} onClose={() => update({ request: null })} /> : null}
      </div>
    </section>
  )
}
