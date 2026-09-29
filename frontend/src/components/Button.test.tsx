import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('로딩 중에는 잠기고 문구가 바뀐다', () => {
    render(<Button isLoading>로그인</Button>)
    const button = screen.getByRole('button', { name: '처리 중…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('호출한 쪽이 disabled={false} 를 넘겨도 로딩 중이면 잠근다', async () => {
    const onClick = vi.fn()
    render(
      <Button isLoading disabled={false} onClick={onClick}>
        로그인
      </Button>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('아이콘 버튼은 글자 없이 label 을 이름과 툴팁으로 쓴다', () => {
    render(<Button icon="refresh" label="새로고침" />)
    const button = screen.getByRole('button', { name: '새로고침' })
    expect(button).toHaveAttribute('title', '새로고침')
    expect(button.textContent).toBe('')
    // 아이콘은 스크린리더에서 숨긴다 — 이름은 버튼이 가진다
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('아이콘 버튼이 로딩 중이면 이름은 유지하고 스피너만 보인다', () => {
    render(<Button icon="refresh" label="새로고침" isLoading />)
    const button = screen.getByRole('button', { name: '새로고침' })
    expect(button).toBeDisabled()
    expect(button.textContent).toBe('')
  })

  it('기본 type 은 button — 폼 안에서 의도치 않게 제출하지 않는다', () => {
    render(<Button>취소</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
