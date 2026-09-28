import { useEffect, useMemo, useRef, useState } from 'react'

import { HistoryScroller } from '@/components/HistoryScroller'
import { useChatHistory } from '@/hooks/useChatHistory'
import { ChatInput } from './ChatInput'
import type { ChatInputHandle } from './ChatInput'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage } from './types'
import { useChatMessages } from './useChatMessages'

/** 이보다 오래 걸리면 서버를 깨우는 중일 수 있다고 안내한다 (Railway 슬리핑 대응) */
const SLOW_NOTICE_MS = 5000

/**
 * 챗 화면 (docs/05-ui-ux.md 화면 3).
 *
 * 진입하면 최근 대화를 불러와 아래가 최신이 되게 두고, 이번에 주고받은 말풍선을 그 아래에
 * 쌓는다. 위로 올리면 이전 대화를 더 불러온다 (내 대화 로그 화면과 같은 규칙).
 * 새로고침해도 대화가 사라지지 않는다.
 */
export default function ChatPage() {
  const history = useChatHistory()
  const { messages, send, retry, isSending } = useChatMessages()
  const inputRef = useRef<ChatInputHandle>(null)
  const [isSlow, setIsSlow] = useState(false)

  // 기록은 이미 오래된 것부터 온다
  const historyMessages = useMemo<ChatMessage[]>(
    () =>
      history.items.flatMap((item): ChatMessage[] => [
        { id: `h-${item.chat_id}-q`, kind: 'user', text: item.question, createdAt: item.created_at },
        { id: `h-${item.chat_id}-a`, kind: 'bot', text: item.answer, createdAt: item.created_at },
      ]),
    [history.items],
  )
  const all = [...historyMessages, ...messages]

  // 응답이 늦으면 보조 안내를 띄운다
  useEffect(() => {
    if (!isSending) return
    const timer = setTimeout(() => setIsSlow(true), SLOW_NOTICE_MS)
    return () => {
      clearTimeout(timer)
      setIsSlow(false)
    }
  }, [isSending])

  const handleSend = async (question: string) => {
    await send(question)
    // 응답이든 오류든 입력칸으로 돌아와 바로 다음 질문을 할 수 있게 한다
    inputRef.current?.focus()
  }

  const handleRetry = async (id: string) => {
    await retry(id)
    inputRef.current?.focus()
  }

  return (
    <section>
      <h1>챗</h1>

      {history.loadError ? (
        <p role="alert">
          이전 대화를 불러오지 못했습니다.{' '}
          <button type="button" onClick={history.retry}>
            다시 불러오기
          </button>
        </p>
      ) : null}

      {!history.isLoading && all.length === 0 ? (
        <p>안녕하세요. 무엇이든 물어보세요.</p>
      ) : null}

      {history.olderError ? (
        <p role="alert">이전 대화를 불러오지 못했습니다. {history.olderError.message}</p>
      ) : null}

      <HistoryScroller
        label="대화 스크롤 영역"
        firstKey={all[0]?.id}
        // 응답 대기 자리는 같은 id 로 답·오류로 바뀐다. 종류까지 넣어야 답이 들어와
        // 말풍선이 길어질 때도 맨 아래로 따라간다
        lastKey={all.length ? `${all.at(-1)!.id}:${all.at(-1)!.kind}` : undefined}
        hasOlder={history.hasOlder}
        isLoadingOlder={history.isLoadingOlder}
        onReachTop={history.loadOlder}
      >
        {/* 새 응답을 스크린리더가 읽어 준다 */}
        <ol aria-label="대화" aria-live="polite">
          {all.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onRetry={handleRetry}
              retryDisabled={isSending}
            />
          ))}
        </ol>
      </HistoryScroller>

      {isSlow ? <p role="status">응답이 늦어지고 있습니다. 서버를 깨우는 중일 수 있어요.</p> : null}

      <ChatInput ref={inputRef} onSend={handleSend} disabled={isSending} />
    </section>
  )
}
