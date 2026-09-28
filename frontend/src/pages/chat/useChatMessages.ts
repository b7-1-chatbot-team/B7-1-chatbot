import { useCallback, useState } from 'react'

import { sendMessage } from '@/api/chat'
import { RESULT_CODE } from '@/api/types'
import { useSubmit } from '@/hooks/useSubmit'
import type { ChatMessage } from './types'

let seq = 0
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${++seq}`
const now = () => new Date().toISOString()

/**
 * 이번 방문에서 주고받은 말풍선과 전송·재시도.
 *
 * 전송은 useSubmit 으로 잠근다. 응답을 기다리는 동안 새 질문이나 [다시 시도] 가
 * 겹쳐 나가지 않는다 (docs/03-api.md 2-1절 "재시도 요청 중에는 버튼·전송 비활성").
 */
export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const { submit, isSubmitting } = useSubmit(sendMessage)

  /** pending 자리를 결과(봇·오류)로 바꾼다 */
  const settle = useCallback(
    async (pendingId: string, question: string) => {
      const result = await submit({ message: question })

      setMessages((prev) =>
        prev.map((message): ChatMessage => {
          if (message.id !== pendingId) return message
          if (result.ok) {
            return { id: pendingId, kind: 'bot', text: result.data.answer, createdAt: result.data.created_at }
          }
          return {
            id: pendingId,
            kind: 'error',
            code: result.error?.code ?? RESULT_CODE.unreachable,
            message: result.error?.message ?? '요청을 처리하지 못했습니다.',
            question,
            createdAt: now(),
          }
        }),
      )
      return result.ok
    },
    [submit],
  )

  /** 새 질문. 사용자 말풍선을 즉시 보이고 그 아래에서 응답을 기다린다 */
  const send = useCallback(
    async (question: string) => {
      const pendingId = nextId('a')
      setMessages((prev) => [
        ...prev,
        { id: nextId('q'), kind: 'user', text: question, createdAt: now() },
        { id: pendingId, kind: 'pending', question },
      ])
      return settle(pendingId, question)
    },
    [settle],
  )

  /**
   * 같은 질문으로 다시 보낸다. 오류 말풍선 자리를 응답 대기로 바꾸고 결과로 교체한다.
   * 서버에는 새 요청이라 실패 기록과 별개로 저장된다 (docs/03-api.md 2-1절).
   */
  const retry = useCallback(
    async (errorId: string) => {
      const target = messages.find((message) => message.id === errorId)
      if (!target || target.kind !== 'error') return false
      setMessages((prev) =>
        prev.map((message) =>
          message.id === errorId ? { id: errorId, kind: 'pending', question: target.question } : message,
        ),
      )
      return settle(errorId, target.question)
    },
    [messages, settle],
  )

  return { messages, send, retry, isSending: isSubmitting }
}
