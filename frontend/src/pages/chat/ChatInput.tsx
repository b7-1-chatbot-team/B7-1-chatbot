import { useImperativeHandle, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, Ref } from 'react'

import { Button } from '@/components/Button'
import styles from './ChatPage.module.css'

/** 질문 최대 글자 수 — 서버 MAX_MESSAGE_LENGTH 와 같다 (docs/03-api.md 2-1절) */
export const MAX_MESSAGE_LENGTH = 1000
/**
 * 입력칸 줄 수. 높이는 고정하고 넘치는 내용은 입력칸 안에서 스크롤한다.
 * 내용에 따라 입력칸이 늘었다 줄었다 하면 대화 영역이 함께 밀려 읽던 위치를 잃는다.
 */
const INPUT_ROWS = 3

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
    <form onSubmit={handleSubmit} className={styles.composer}>
      {/* 입력칸 안내문이 같은 뜻을 보여 주므로 라벨은 스크린리더용으로 둔다 */}
      <label htmlFor="chat-input" className="visually-hidden">
        질문
      </label>
      <div className={styles.composerRow}>
        <textarea
          id="chat-input"
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={INPUT_ROWS}
          // 높이 고정. 사용자가 끌어서 크기를 바꾸지도 못하게 하고, 넘치면 안에서 스크롤한다
          style={{ resize: 'none', overflowY: 'auto' }}
          placeholder="질문을 입력하세요 — Enter 전송, Shift+Enter 줄바꿈"
          aria-describedby="chat-input-count"
        />
        <Button type="submit" variant="primary" disabled={!canSend}>
          전송
        </Button>
      </div>
      <div className={styles.composerFoot}>
        {/* 이 입력이 호출하는 API. 평가자가 화면에서 바로 확인한다 (docs/05-ui-ux.md 화면 3) */}
        <code className={styles.api}>POST /api/chat</code>
        {/* 한도에 닿으면 data-limit — 주황색 */}
        <span id="chat-input-count" className={styles.counter} data-limit={atLimit || undefined}>
          {value.length} / {MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </form>
  )
}
