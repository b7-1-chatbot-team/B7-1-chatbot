import { useContext, useEffect, useRef } from 'react'

import { TOAST_DURATION_MS, ToastContext } from '@/store/toastContext'
import type { ToastItem } from '@/store/toastContext'
import { Button } from './Button'
import styles from './Toast.module.css'

/** 헤더 안에 두는 토스트 자리. 비어 있으면 아무것도 그리지 않는다 */
export function ToastRegion() {
  const { toasts, dismiss } = useContext(ToastContext)
  if (toasts.length === 0) return null

  return (
    <div className={styles.region}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  )
}

/**
 * 토스트 한 개.
 * 마우스를 올리거나 안의 버튼에 포커스가 있으면 사라지지 않고 멈춘다 — 읽거나 누르는 중이다.
 */
function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const remaining = useRef<number>(TOAST_DURATION_MS[toast.tone])
  const startedAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const start = () => {
    clearTimeout(timer.current)
    startedAt.current = Date.now()
    timer.current = setTimeout(onDismiss, remaining.current)
  }
  const pause = () => {
    clearTimeout(timer.current)
    remaining.current -= Date.now() - startedAt.current
  }

  useEffect(() => {
    start()
    return () => clearTimeout(timer.current)
    // 처음 한 번만 시작한다. 멈춤·재개는 이벤트가 맡는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={`${styles.toast} ${toast.tone === 'error' ? styles.error : ''}`}
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
    >
      <span className={styles.message}>{toast.message}</span>
      {toast.action ? (
        <Button
          variant="ghost"
          size="sm"
          icon="refresh"
          label={toast.action.label}
          onClick={() => {
            toast.action?.onClick()
            onDismiss()
          }}
        />
      ) : null}
      <Button variant="ghost" size="sm" icon="close" label="닫기" onClick={onDismiss} />
    </div>
  )
}
