import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ChatInput, MAX_MESSAGE_LENGTH } from './ChatInput'

function setup(disabled = false) {
  const onSend = vi.fn()
  render(<ChatInput onSend={onSend} disabled={disabled} />)
  const input = screen.getByLabelText('질문')
  const sendButton = screen.getByRole('button', { name: '전송' })
  return { onSend, input, sendButton }
}

describe('ChatInput — 키 입력 규칙', () => {
  it('Enter 는 전송하고 입력칸을 비운다', async () => {
    const user = userEvent.setup()
    const { onSend, input } = setup()

    await user.type(input, '안녕하세요{Enter}')

    expect(onSend).toHaveBeenCalledWith('안녕하세요')
    expect(input).toHaveValue('')
  })

  it('Shift+Enter 는 전송하지 않고 줄을 바꾼다', async () => {
    const user = userEvent.setup()
    const { onSend, input } = setup()

    await user.type(input, '첫 줄{Shift>}{Enter}{/Shift}둘째 줄')

    expect(onSend).not.toHaveBeenCalled()
    expect(input).toHaveValue('첫 줄\n둘째 줄')
  })

  it('한글 조합 중 Enter 는 무시한다 (마지막 글자 중복 전송 방지)', () => {
    const { onSend, input } = setup()
    fireEvent.change(input, { target: { value: '안녕' } })

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

    expect(onSend).not.toHaveBeenCalled()
    expect(input).toHaveValue('안녕')
  })

  it('isComposing 을 주지 않는 브라우저의 조합 Enter(keyCode 229)도 무시한다', () => {
    const { onSend, input } = setup()
    fireEvent.change(input, { target: { value: '안녕' } })

    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })

    expect(onSend).not.toHaveBeenCalled()
  })

  it('조합이 끝난 뒤의 Enter 는 전송한다', () => {
    const { onSend, input } = setup()
    fireEvent.change(input, { target: { value: '안녕' } })

    fireEvent.keyDown(input, { key: 'Enter', isComposing: false })

    expect(onSend).toHaveBeenCalledWith('안녕')
  })
})

describe('ChatInput — 전송 조건', () => {
  it('비어 있거나 공백뿐이면 보낼 수 없다', async () => {
    const user = userEvent.setup()
    const { onSend, input, sendButton } = setup()

    expect(sendButton).toBeDisabled()
    await user.type(input, '   {Enter}')

    expect(sendButton).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('앞뒤 공백을 빼고 보낸다', async () => {
    const user = userEvent.setup()
    const { onSend, input } = setup()

    await user.type(input, '  질문  {Enter}')

    expect(onSend).toHaveBeenCalledWith('질문')
  })

  it('응답을 기다리는 중에는 보낼 수 없다', async () => {
    const user = userEvent.setup()
    const { onSend, input, sendButton } = setup(true)

    await user.type(input, '질문{Enter}')

    expect(sendButton).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('1000자에서 입력이 막히고 글자 수를 보여준다', () => {
    const { input } = setup()

    expect(input).toHaveAttribute('maxLength', String(MAX_MESSAGE_LENGTH))
    fireEvent.change(input, { target: { value: 'a'.repeat(MAX_MESSAGE_LENGTH) } })

    const counter = screen.getByText(`${MAX_MESSAGE_LENGTH} / ${MAX_MESSAGE_LENGTH}`)
    expect(counter).toHaveAttribute('data-limit', 'true')
  })
})
