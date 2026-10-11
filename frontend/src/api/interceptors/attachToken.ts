import type { InternalAxiosRequestConfig } from 'axios'

import { getAccessToken } from '@/utils/tokenStorage'

/**
 * 요청 인터셉터 — Authorization 헤더를 자동으로 붙인다.
 *
 * 매 요청마다 저장소에서 읽는다. 모듈 로드 시점에 한 번 읽어두면
 * 재발급으로 토큰이 회전된 뒤에도 옛 토큰을 계속 보내게 된다.
 *
 * 토큰이 없으면 헤더를 붙이지 않는다. 인증이 필요한 요청이었다면
 * 서버가 code 401 로 답하고, 재발급 인터셉터가 처리한다.
 */
export function attachToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}
