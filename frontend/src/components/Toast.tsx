import { useContext, useEffect, useRef } from 'react'

import { TOAST_DURATION_MS, ToastContext } from '@/store/toastContext'
import type { ToastItem } from '@/store/toastContext'
import { Button } from './Button'
import styles from './Toast.module.css'

/**
 * 헤더 안에 두는 토스트 자리.
 * 비어 있어도 영역은 늘 둔다 — 알림 영역(aria-live)이 미리 있어야 스크린리더가 새 알림을 안정적으로 읽는다.
 * 뜰 때 영역까지 새로 만들면 읽지 않고 넘어가는 경우가 있다
 */
export function ToastRegion() {
  const { toasts, dismiss } = useContext(ToastContext)

  return (
    <div className={styles.region} aria-live="polite">
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
      // 정보는 바깥 영역(aria-live=polite)이 읽는다. 오류만 alert 로 바로 읽게 한다 — 겹치면 두 번 읽힌다
      role={toast.tone === 'error' ? 'alert' : undefined}
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
