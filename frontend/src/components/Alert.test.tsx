import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Alert } from './Alert'
import { LoadingStatus } from './Spinner'

describe('Alert', () => {
  it('오류는 바로 읽히도록 alert, 성공은 status', () => {
    render(
      <>
        <Alert tone="error">서버에 연결할 수 없습니다.</Alert>
        <Alert tone="success">가입이 완료되었습니다.</Alert>
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('서버에 연결할 수 없습니다.')
    expect(screen.getByRole('status')).toHaveTextContent('가입이 완료되었습니다.')
  })

  it('문구 옆에 동작 버튼을 둘 수 있다', () => {
    render(
      <Alert tone="error" action={<button type="button">다시</button>}>
        불러오지 못했습니다.
      </Alert>,
    )
    expect(screen.getByRole('alert')).toContainElement(screen.getByRole('button', { name: '다시' }))
  })
})

describe('LoadingStatus', () => {
  it('문구를 status 로 읽고 스피너는 숨긴다', () => {
    render(<LoadingStatus>불러오는 중…</LoadingStatus>)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('불러오는 중…')
    expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })
})
