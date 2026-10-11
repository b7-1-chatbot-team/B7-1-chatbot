import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from './ErrorBoundary'

function Broken(): never {
  throw new Error('화면 코드 결함')
}

beforeEach(() => {
  // 의도한 오류라 테스트 출력을 어지럽히지 않게 막는다
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('자식이 오류를 던지면 흰 화면 대신 안내와 새로고침 아이콘을 보여준다', () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('문제가 생겼습니다')
    expect(screen.getByRole('button', { name: '새로고침' }).textContent).toBe('')
  })

  it('주소(resetKey)가 바뀌면 오류를 풀고 새 화면을 그린다', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/chat">
        <Broken />
      </ErrorBoundary>,
    )
    rerender(
      <ErrorBoundary resetKey="/logs">
        <p>로그 화면</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('로그 화면')).toBeInTheDocument()
  })

  it('오류가 없으면 자식을 그대로 그린다', () => {
    render(
      <ErrorBoundary>
        <p>정상</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('정상')).toBeInTheDocument()
  })
})
