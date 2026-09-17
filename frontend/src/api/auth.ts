import { instance } from './instance'
import type {
  LoginRequest,
  MeResponse,
  RefreshTokenRequest,
  SignupRequest,
  SignupResponse,
  TokenPair,
} from './types'

/**
 * 인증 API (docs/03-api.md §1).
 *
 * 화면은 instance 를 직접 쓰지 않고 이 함수들만 쓴다.
 * 실패는 인터셉터가 ApiError 로 바꿔 던지므로 여기서 code 를 다루지 않는다.
 *
 * signal 은 선택이다. 화면을 벗어날 때 요청을 취소하려면 넘긴다.
 * 로그인·로그아웃처럼 중간에 끊으면 곤란한 요청에는 넘기지 않는다.
 */

/** 회원가입. 이메일 중복은 409, 검증 실패는 422 로 온다 */
export async function signup(body: SignupRequest, signal?: AbortSignal): Promise<SignupResponse> {
  const response = await instance.post<SignupResponse>('/api/auth/signup', body, { signal })
  return response.data
}

/** 로그인. 이메일·비밀번호 불일치는 401 로 온다 */
export async function login(body: LoginRequest, signal?: AbortSignal): Promise<TokenPair> {
  const response = await instance.post<TokenPair>('/api/auth/login', body, { signal })
  return response.data
}

/**
 * 토큰 재발급.
 *
 * 평소에는 인터셉터가 401 을 받아 자동으로 호출하므로 화면에서 직접 부를 일이 없다.
 * 재발급 시 refresh token 도 새 값으로 회전된다.
 */
export async function refresh(body: RefreshTokenRequest, signal?: AbortSignal): Promise<TokenPair> {
  const response = await instance.post<TokenPair>('/api/auth/refresh', body, { signal })
  return response.data
}

/**
 * 로그아웃. 서버에서 refresh token 행을 지운다.
 *
 * 이미 없거나 만료된 토큰이어도 200 이다. 호출한 쪽은 응답과 관계없이
 * 저장된 토큰을 지운다 (docs/03-api.md §1-5).
 */
export async function logout(body: RefreshTokenRequest, signal?: AbortSignal): Promise<void> {
  await instance.post('/api/auth/logout', body, { signal })
}

/** 현재 사용자. 새로고침 후 상태 복원과 관리자 메뉴 표시 판단에 쓴다 */
export async function me(signal?: AbortSignal): Promise<MeResponse> {
  const response = await instance.get<MeResponse>('/api/auth/me', { signal })
  return response.data
}
