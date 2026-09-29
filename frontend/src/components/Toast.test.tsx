import { act, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useToast } from '@/hooks/useToast'
import { TOAST_DURATION_MS } from '@/store/toastContext'
import type { ToastOptions } from '@/store/toastContext'
import { ToastProvider } from '@/store/ToastProvider'
import { ToastRegion } from './Toast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** 테스트에서 show() 를 부르기 위해 꺼내 둔다 */
const captured: { show: (message: string, options?: ToastOptions) => void } = { show: () => {} }
const show = (message: string, options?: ToastOptions) => captured.show(message, options)

function Capture() {
  const showToast = useToast()
  useEffect(() => {
    captured.show = showToast
  }, [showToast])
  return null
}

function renderToasts() {
  render(
    <ToastProvider>
      <Capture />
      <ToastRegion />
    </ToastProvider>,
  )
}

const toasts = () => [...screen.queryAllByRole('status'), ...screen.queryAllByRole('alert')]

describe('토스트', () => {
  it('정보는 status, 오류는 alert 로 뜬다', () => {
    renderToasts()
    act(() => {
      show('로그아웃되었습니다.')
      show('이전 기록을 불러오지 못했습니다.', { tone: 'error' })
    })
    expect(screen.getByRole('status')).toHaveTextContent('로그아웃되었습니다.')
    expect(screen.getByRole('alert')).toHaveTextContent('이전 기록을 불러오지 못했습니다.')
  })

  it('정보 4초 · 오류 6초 뒤 사라진다', () => {
    renderToasts()
    act(() => {
      show('정보')
      show('오류', { tone: 'error' })
    })
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS.info))
    expect(screen.queryByText('정보')).toBeNull()
    expect(screen.getByText('오류')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS.error - TOAST_DURATION_MS.info))
    expect(screen.queryByText('오류')).toBeNull()
  })

  it('마우스를 올린 동안은 사라지지 않고, 떼면 남은 시간만큼 뒤 사라진다', () => {
    renderToasts()
    act(() => show('읽는 중'))
    const toast = screen.getByRole('status')

    act(() => vi.advanceTimersByTime(3000))
    fireEvent.mouseEnter(toast)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('읽는 중')).toBeInTheDocument()

    fireEvent.mouseLeave(toast)
    act(() => vi.advanceTimersByTime(999))
    expect(screen.getByText('읽는 중')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('읽는 중')).toBeNull()
  })

  it('최대 3개, 새 것이 위이고 넘치면 가장 오래된 것이 빠진다', () => {
    renderToasts()
    act(() => ['1', '2', '3', '4'].forEach((n) => show(`알림 ${n}`)))
    expect(toasts().map((t) => t.textContent)).toEqual(['알림 4', '알림 3', '알림 2'])
  })

  it('[닫기] 로 바로 닫힌다', () => {
    renderToasts()
    act(() => show('닫을 알림'))
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByText('닫을 알림')).toBeNull()
  })

  it('동작 버튼은 아이콘으로 그리고, 누르면 동작 후 닫힌다', () => {
    const retry = vi.fn()
    renderToasts()
    act(() => show('불러오지 못했습니다.', { tone: 'error', action: { label: '다시 불러오기', onClick: retry } }))

    const button = screen.getByRole('button', { name: '다시 불러오기' })
    expect(button.textContent).toBe('')
    fireEvent.click(button)
    expect(retry).toHaveBeenCalledOnce()
    expect(screen.queryByText('불러오지 못했습니다.')).toBeNull()
  })

  it('Provider 없이 useToast 를 불러도 깨지지 않는다 (아무 일도 하지 않음)', () => {
    render(<Capture />)
    expect(() => show('무시됨')).not.toThrow()
  })
})
