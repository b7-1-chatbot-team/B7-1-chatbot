import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { ToastContext } from './toastContext'
import type { ToastContextValue, ToastItem, ToastOptions } from './toastContext'

/** 동시에 보이는 최대 개수 (docs/05-ui-ux.md 1절 토스트) */
const MAX_TOASTS = 3

let nextId = 1

/**
 * 토스트 목록을 들고 앱 전체에 show() 를 공급한다.
 *
 * AuthProvider 보다 바깥에 둔다. 로그인 만료 알림을 인증 상태 쪽에서 띄우기 때문이다.
 * 그리는 자리는 헤더 바로 아래다 (layouts/Header 의 ToastRegion).
 * 헤더 높이는 모바일에서 두 줄로 바뀌어, 높이를 계산하지 않고 헤더에 붙여 그린다.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    const item: ToastItem = { id: nextId++, message, tone: options.tone ?? 'info', action: options.action }
    // 새 것이 위. 넘치면 가장 오래된 것을 뺀다
    setToasts((prev) => [item, ...prev].slice(0, MAX_TOASTS))
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ show, dismiss, toasts }), [show, dismiss, toasts])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
