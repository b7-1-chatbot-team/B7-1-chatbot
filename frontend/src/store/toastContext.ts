import { createContext } from 'react'

export type ToastTone = 'info' | 'error'

/** 사라지기까지 (docs/05-ui-ux.md 1절 토스트 — 정보 4초·오류 6초). 오류는 읽을 시간이 더 필요하다 */
export const TOAST_DURATION_MS = { info: 4000, error: 6000 } as const

export interface ToastOptions {
  tone?: ToastTone
  /** 문구 오른쪽의 동작. "다시 불러오기" 처럼 새로고침 아이콘 버튼으로 그린다 */
  action?: { label: string; onClick: () => void }
}

export interface ToastItem extends Required<Pick<ToastOptions, 'tone'>> {
  id: number
  message: string
  action?: ToastOptions['action']
}

export interface ToastContextValue {
  show: (message: string, options?: ToastOptions) => void
  dismiss: (id: number) => void
  toasts: ToastItem[]
}

/**
 * Provider 밖에서는 아무 일도 하지 않는다.
 * 토스트는 보조 알림이라, 이를 쓰는 컴포넌트를 Provider 없이 테스트해도 깨지지 않게 한다.
 */
export const ToastContext = createContext<ToastContextValue>({ show: () => {}, dismiss: () => {}, toasts: [] })
