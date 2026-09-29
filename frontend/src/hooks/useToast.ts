import { useContext } from 'react'

import { ToastContext } from '@/store/toastContext'

/** 토스트 띄우기 — `show('로그아웃되었습니다.')` / `show(문구, { tone: 'error', action })` */
export function useToast() {
  return useContext(ToastContext).show
}
