import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { login as loginApi, logout as logoutApi, me as meApi } from '@/api/auth'
import type { MeResponse } from '@/api/types'
import { useAccessToken } from '@/hooks/useAccessToken'
import { clearTokens, getRefreshToken, saveTokens } from '@/utils/tokenStorage'
import { AuthContext } from './authContext'
import type { AuthContextValue, AuthStatus } from './types'

/**
 * 인증 상태를 앱 전체에 공급한다.
 *
 * GET /api/auth/me 는 **앱이 전체 로드될 때 한 번만** 호출한다. 화면마다 각자 부르면
 * 헤더·가드·페이지가 같은 정보를 중복 조회하게 된다.
 * SPA 내부 이동에서는 이 컴포넌트가 다시 마운트되지 않으므로 호출되지 않는다.
 *
 * 토큰은 이 컴포넌트가 들고 있지 않고 useAccessToken 으로 **구독**한다.
 * 그래서 인터셉터가 재발급 실패로 clearTokens() 를 호출하면, AuthContext 를 모르는
 * 채로도 여기까지 전달되어 로그아웃 상태가 된다 (docs/12-decisions.md §17).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const accessToken = useAccessToken()
  const [fetchedUser, setFetchedUser] = useState<MeResponse | null>(null)

  // 토큰이 없으면 사용자도 없다. effect 에서 setState 로 지우면 연쇄 렌더가 생기므로
  // 렌더 중에 파생한다. 토큰이 사라지는 경우는 로그아웃과 재발급 최종 실패 두 가지다
  const user = accessToken ? fetchedUser : null

  useEffect(() => {
    // 토큰이 없으면 물어볼 것이 없다. 이미 확인된 사용자면 화면 이동마다 다시 묻지 않는다
    if (!accessToken || user) return

    const controller = new AbortController()
    meApi(controller.signal)
      .then(setFetchedUser)
      .catch(() => {
        // 취소는 컴포넌트가 사라졌다는 뜻이므로 상태를 건드리지 않는다
        if (controller.signal.aborted) return
        // 토큰이 유효하지 않다. 지우면 구독을 통해 anonymous 로 전환된다
        clearTokens()
      })

    return () => controller.abort()
  }, [accessToken, user])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginApi({ email, password })
    // 사용자 정보는 위 effect 가 토큰 변화를 받아 이어서 불러온다.
    // 여기서 직접 부르면 /api/auth/me 가 두 번 호출된다
    saveTokens(tokens.access_token, tokens.refresh_token)
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) await logoutApi({ refresh_token: refreshToken })
    } finally {
      // 서버 응답과 관계없이 지운다 (docs/03-api.md §1-5).
      // 네트워크 오류로 로그아웃이 막히면 안 된다
      clearTokens()
      setFetchedUser(null)
    }
  }, [])

  const status: AuthStatus = !accessToken ? 'anonymous' : user ? 'authenticated' : 'checking'

  // Context 는 값의 참조가 바뀌면 구독 컴포넌트를 모두 리렌더한다.
  // 객체 리터럴을 그대로 넘기면 Provider 가 렌더될 때마다 새 객체가 된다 (docs/12-decisions.md §18)
  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
