import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, Ref } from 'react'

import { Button } from '@/components/Button'

/** 질문 최대 글자 수 — 서버 MAX_MESSAGE_LENGTH 와 같다 (docs/03-api.md 2-1절) */
export const MAX_MESSAGE_LENGTH = 1000
/** 입력칸이 늘어나는 최대 높이 */
const MAX_HEIGHT_PX = 140

export interface ChatInputHandle {
  focus: () => void
}

interface ChatInputProps {
  onSend: (question: string) => void
  /** 응답을 기다리는 중 — 전송을 잠근다 */
  disabled: boolean
  ref?: Ref<ChatInputHandle>
}

/**
 * 질문 입력칸.
 *
 * - Enter 는 전송, Shift+Enter 는 줄바꿈
 * - **한글 조합 중 Enter 는 무시한다.** 조합을 끝내는 Enter 가 한 번 더 keydown 으로 들어와,
 *   막지 않으면 마지막 글자가 남은 채로 한 번 더 전송된다
 * - 앞뒤 공백을 뺀 내용이 없거나 전송 중이면 보낼 수 없다
 */
export function ChatInput({ onSend, disabled, ref }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), [])

  const question = value.trim()
  const canSend = question.length > 0 && !disabled

  // 내용에 맞춰 높이를 맞춘다. 값이 화면에 반영된 뒤 재야 한다 — 전송 직후 비울 때
  // 이벤트 안에서 재면 아직 이전 내용이 남아 있어 두 줄 높이가 그대로 남는다
  useLayoutEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value)
  }

  const send = () => {
    if (!canSend) return
    onSend(question)
    setValue('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    // 조합 중인 Enter. keyCode 229 는 isComposing 을 주지 않는 일부 브라우저(구형 Safari) 대응
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    send()
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    send()
  }

  const atLimit = value.length >= MAX_MESSAGE_LENGTH

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="chat-input">질문</label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={1}
        placeholder="질문을 입력하세요 — Enter 전송, Shift+Enter 줄바꿈"
        aria-describedby="chat-input-count"
      />
      {/* 한도에 닿으면 data-limit 로 표시한다. 색은 스타일링 단계에서 주황으로 준다 */}
      <span id="chat-input-count" data-limit={atLimit || undefined}>
        {value.length} / {MAX_MESSAGE_LENGTH}
      </span>
      <Button type="submit" disabled={!canSend}>
        전송
      </Button>
    </form>
  )
}
