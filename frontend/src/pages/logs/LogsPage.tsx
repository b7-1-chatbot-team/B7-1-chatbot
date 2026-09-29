import { useState } from 'react'

import { Button } from '@/components/Button'
import { HistoryScroller } from '@/components/HistoryScroller'
import { useChatHistory } from '@/hooks/useChatHistory'
import { LogCard } from './LogCard'
import styles from './LogsPage.module.css'

/**
 * 내 대화 로그 화면 (docs/05-ui-ux.md 화면 4).
 *
 * mission 4-4절 "사용자 기준 로그 조회/추적"을 화면으로 보여주는 곳이다.
 * 조회 범위는 서버가 토큰의 사용자로 강제하므로 다른 사람의 기록은 오지 않는다.
 *
 * 챗 화면과 같은 규칙으로 보여준다 — 아래가 최신, 위로 올리면 이전 기록을 더 불러온다.
 *
 * [새로고침] 은 목록을 key 로 새로 그린다. 받아 둔 페이지·오류·진행 상태를 하나씩
 * 초기화하지 않아도 되고, 초기화를 빠뜨리는 실수가 생기지 않는다.
 */
export default function LogsPage() {
  const [version, setVersion] = useState(0)
  return <LogsView key={version} onRefresh={() => setVersion((v) => v + 1)} />
}

function LogsView({ onRefresh }: { onRefresh: () => void }) {
  const history = useChatHistory()

  return (
    <section>
      <h1>내 대화 로그</h1>
      <p>로그인한 사용자 본인의 기록만 보입니다.</p>

      <p>
        총 기록 <strong aria-label="총 기록 수">{history.isLoading ? '…' : history.total}</strong>건{' '}
        <Button onClick={onRefresh} disabled={history.isLoading}>
          새로고침
        </Button>
      </p>

      {history.loadError ? (
        <p role="alert">
          대화 기록을 불러오지 못했습니다. {history.loadError.message}{' '}
          <button type="button" onClick={history.retry}>
            다시 불러오기
          </button>
        </p>
      ) : null}

      {!history.isLoading && !history.loadError && history.items.length === 0 ? (
        <p>아직 저장된 대화가 없습니다.</p>
      ) : null}

      {/* 이전 기록을 불러오지 못해도 이미 받은 목록은 그대로 둔다 */}
      {history.olderError ? (
        <p role="alert">이전 기록을 불러오지 못했습니다. {history.olderError.message}</p>
      ) : null}

      <HistoryScroller
        label="대화 기록 스크롤 영역"
        className={styles.scroller}
        firstKey={history.items[0]?.chat_id}
        lastKey={history.items.at(-1)?.chat_id}
        hasOlder={history.hasOlder}
        isLoadingOlder={history.isLoadingOlder}
        onReachTop={history.loadOlder}
      >
        <ol aria-label="대화 기록">
          {history.items.map((item) => (
            <li key={item.chat_id}>
              <LogCard item={item} />
            </li>
          ))}
        </ol>
      </HistoryScroller>
    </section>
  )
}
