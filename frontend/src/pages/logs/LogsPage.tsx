import { useState } from 'react'

import { Button } from '@/components/Button'
import { LogCard } from './LogCard'
import { useChatLogs } from './useChatLogs'

/**
 * 내 대화 로그 화면 (docs/05-ui-ux.md 화면 4).
 *
 * mission 4-4절 "사용자 기준 로그 조회/추적"을 화면으로 보여주는 곳이다.
 * 조회 범위는 서버가 토큰의 사용자로 강제하므로 다른 사람의 기록은 오지 않는다.
 *
 * [새로고침] 은 목록을 key 로 새로 그린다. 받아 둔 페이지·오류·진행 상태를 하나씩
 * 초기화하지 않아도 되고, 초기화를 빠뜨리는 실수가 생기지 않는다.
 */
export default function LogsPage() {
  const [version, setVersion] = useState(0)
  return <LogsView key={version} onRefresh={() => setVersion((v) => v + 1)} />
}

function LogsView({ onRefresh }: { onRefresh: () => void }) {
  const logs = useChatLogs()

  return (
    <section>
      <h1>내 대화 로그</h1>
      <p>로그인한 사용자 본인의 기록만 보입니다.</p>

      <p>
        총 기록 <strong aria-label="총 기록 수">{logs.isLoading ? '…' : logs.total}</strong>건{' '}
        <Button onClick={onRefresh} disabled={logs.isLoading}>
          새로고침
        </Button>
      </p>

      {logs.loadError ? (
        <p role="alert">
          대화 기록을 불러오지 못했습니다. {logs.loadError.message}{' '}
          <button type="button" onClick={logs.retry}>
            다시 불러오기
          </button>
        </p>
      ) : null}

      {!logs.isLoading && !logs.loadError && logs.items.length === 0 ? (
        <p>아직 저장된 대화가 없습니다.</p>
      ) : null}

      <ol aria-label="대화 기록">
        {logs.items.map((item) => (
          <li key={item.chat_id}>
            <LogCard item={item} />
          </li>
        ))}
      </ol>

      {/* [더 보기] 가 실패해도 이미 받은 목록은 그대로 둔다 */}
      {logs.moreError ? <p role="alert">더 불러오지 못했습니다. {logs.moreError.message}</p> : null}

      {logs.hasMore ? (
        <Button onClick={logs.fetchMore} isLoading={logs.isFetchingMore} loadingLabel="불러오는 중…">
          더 보기
        </Button>
      ) : null}
    </section>
  )
}
