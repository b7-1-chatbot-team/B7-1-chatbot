import type { MeResponse } from '@/api/types'

/**
 * 인증 상태 (docs/05-ui-ux.md §2).
 *
 * 가드는 토큰 유무와 사용자 정보 유무를 각각 검사하지 않고 이 값 하나로 판정한다.
 */
export type AuthStatus =
  /** localStorage 에 access token 이 없다. 서버에 묻지 않고 즉시 로그인으로 보낸다 */
  | 'anonymous'
  /** 토큰은 있고 GET /api/auth/me 응답을 기다리는 중이다. 판정을 미룬다 */
  | 'checking'
  /** 토큰이 있고 사용자 정보를 받아왔다 */
  | 'authenticated'

export interface AuthContextValue {
  /** 현재 사용자. status 가 authenticated 일 때만 값이 있다 */
  user: MeResponse | null
  status: AuthStatus
  /** 로그인 후 토큰을 저장한다. 사용자 정보는 토큰 변화를 구독한 Provider 가 이어서 불러온다 */
  login: (email: string, password: string) => Promise<void>
  /** 서버에 refresh token 폐기를 요청하고, 응답과 관계없이 저장된 토큰을 지운다 */
  logout: () => Promise<void>
}
