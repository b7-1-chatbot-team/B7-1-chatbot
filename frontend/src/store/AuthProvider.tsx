import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { login as loginApi, logout as logoutApi, me as meApi } from '@/api/auth'
import type { MeResponse } from '@/api/types'
import { useAccessToken } from '@/hooks/useAccessToken'
import { useToast } from '@/hooks/useToast'
import { clearTokens, getRefreshToken, saveTokens, takeClearReason } from '@/utils/tokenStorage'
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
 * 채로도 여기까지 전달되어 로그아웃 상태가 된다 (docs/12-decisions.md 17절).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const accessToken = useAccessToken()

  /**
   * 확인한 사용자와, 그 확인에 쓴 토큰을 함께 둔다.
   * user 가 null 이면 확인에 실패했다는 뜻이다 (연결 실패 등).
   *
   * 사용자만 들고 있으면 토큰이 바뀌어도 "이미 확인됨"으로 보고 다시 묻지 않는다.
   * 그러면 재발급 실패로 토큰이 지워진 뒤 다른 계정으로 로그인했을 때 이전 사용자의
   * 권한으로 판정된다 (일반 사용자로 판정되어 관리자가 /admin 에서 튕김).
   */
  const [checked, setChecked] = useState<{ token: string; user: MeResponse | null } | null>(null)

  // 토큰이 한 번 비워졌다면(로그아웃·재발급 실패) 이전 사용자 정보를 버린다.
  // effect 가 아니라 렌더 중에 처리한다 — 다음 로그인의 첫 렌더부터 이전 사용자가 보이면 안 된다
  const [prevToken, setPrevToken] = useState(accessToken)
  if (accessToken !== prevToken) {
    setPrevToken(accessToken)
    if (!accessToken) setChecked(null)
  }

  const isConfirmed = accessToken !== null && checked?.token === accessToken

  // 재발급으로 토큰이 회전되면 다시 확인하는 동안 직전 사용자를 계속 보여준다.
  // 같은 세션 안의 회전이라 사용자는 같고, 비워 두면 15분마다 화면이 깜빡인다
  const user = accessToken ? (checked?.user ?? null) : null

  useEffect(() => {
    if (!accessToken || isConfirmed) return

    const controller = new AbortController()
    meApi(controller.signal)
      .then((data) => setChecked({ token: accessToken, user: data }))
      .catch(() => {
        // 취소는 컴포넌트가 사라졌다는 뜻이므로 상태를 건드리지 않는다
        if (controller.signal.aborted) return
        // 여기서 토큰을 지우지 않는다. 401 이면 인터셉터가 이미 재발급을 시도했고,
        // 그마저 실패했다면 인터셉터가 지웠다. 연결 실패 같은 일시 오류에 지우면
        // 저장소를 공유하는 모든 탭이 함께 로그아웃된다. 이 탭만 비로그인으로 둔다
        setChecked({ token: accessToken, user: null })
      })

    return () => controller.abort()
  }, [accessToken, isConfirmed])

  // 재발급까지 실패해 토큰이 지워졌으면 알린다. 가드가 로그인 화면으로 보내므로 그 위에 뜬다.
  // 직접 로그아웃(헤더가 따로 알림)·다른 탭 로그아웃(이유 없음)은 여기서 알리지 않는다
  const showToast = useToast()
  const hadToken = useRef(accessToken !== null)
  useEffect(() => {
    if (hadToken.current && !accessToken && takeClearReason() === 'expired') {
      showToast('로그인이 만료되었습니다. 다시 로그인해 주세요.')
    }
    hadToken.current = accessToken !== null
  }, [accessToken, showToast])

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
      // 서버 응답과 관계없이 지운다 (docs/03-api.md 1-5절).
      // 네트워크 오류로 로그아웃이 막히면 안 된다
      clearTokens()
      setChecked(null)
    }
  }, [])

  const status: AuthStatus = !accessToken
    ? 'anonymous'
    : isConfirmed
      ? checked?.user
        ? 'authenticated'
        : 'anonymous' // 확인 실패 — 저장소는 두고 이 탭만 비로그인
      : user
        ? 'authenticated' // 회전 후 재확인 중
        : 'checking'

  // Context 는 값의 참조가 바뀌면 구독 컴포넌트를 모두 리렌더한다.
  // 객체 리터럴을 그대로 넘기면 Provider 가 렌더될 때마다 새 객체가 된다 (docs/12-decisions.md 18절)
  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
