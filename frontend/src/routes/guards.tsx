import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { PATHS } from './paths'

/**
 * 라우팅 가드 (docs/05-ui-ux.md §2).
 *
 * 가드는 토큰 유무와 사용자 정보 유무를 각각 검사하지 않고 AuthStatus 한 값으로 판정한다.
 *
 * **프론트 가드는 화면 이동용이다.** 권한 검사는 서버 require_admin 이 최종이며,
 * 사용자가 Context 값을 조작해도 관리자 API 는 서버가 403 으로 막는다.
 */

/** 로그인 필수 경로. 비로그인은 화면이 렌더되기 전에 로그인으로 보낸다 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  // 아직 판정할 수 없다. 여기서 로그인으로 보내면 새로고침마다 로그인 화면이 번쩍인다
  if (status === 'checking') return null

  if (status !== 'authenticated') {
    // 로그인 후 원래 가려던 곳으로 돌아가기 위해 경로를 함께 넘긴다
    return <Navigate to={PATHS.login} replace state={{ from: location }} />
  }

  return children
}

/** 관리자 전용 경로. 일반 사용자는 챗으로 보낸다 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'checking') return null

  if (status !== 'authenticated') {
    return <Navigate to={PATHS.login} replace state={{ from: location }} />
  }

  // 로그인은 했으나 권한이 없다. 로그인 화면으로 보내면 이미 로그인한 사용자가 혼란스럽다
  if (user?.role !== 'admin') return <Navigate to={PATHS.chat} replace />

  return children
}

/** 게스트 전용 경로(로그인·회원가입). 로그인 상태면 챗으로 보낸다 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'checking') return null
  if (status === 'authenticated') return <Navigate to={PATHS.chat} replace />

  return children
}
