import { useContext } from 'react'

import { AuthContext } from '@/store/authContext'
import type { AuthContextValue } from '@/store/types'

/**
 * 인증 상태를 읽는다. Provider 안에서만 쓸 수 있다.
 *
 * Provider 밖에서 쓰면 조용히 기본값을 돌려주는 대신 오류를 던진다.
 * 그래야 "로그인했는데 화면이 비로그인으로 보인다" 같은 증상 대신
 * 원인이 바로 드러난다.
 */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth 는 AuthProvider 안에서만 사용할 수 있습니다.')
  }
  return value
}
