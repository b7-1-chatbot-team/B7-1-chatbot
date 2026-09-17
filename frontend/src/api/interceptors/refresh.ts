import type { AxiosInstance, AxiosResponse } from 'axios'

import { clearTokens, getRefreshToken, saveTokens } from '@/utils/tokenStorage'
import { isApiError } from '../ApiError'
import { RESULT_CODE } from '../types'
import type { TokenPair } from '../types'

/**
 * 이 API 들의 401 은 재발급 대상이 아니다.
 * 로그인 실패는 폼에서 안내하고, 재발급·로그아웃의 401 은 재로그인이 필요하다는 뜻이다.
 */
const AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']

/**
 * 진행 중인 재발급 요청 (single-flight).
 *
 * refresh token 은 재발급마다 회전되어 이전 토큰이 즉시 폐기된다(docs/03-api.md §1-4).
 * 동시에 401 을 받은 요청들이 각자 재발급하면 뒤늦은 쪽이 이미 폐기된 토큰을 써서
 * 사용자가 로그아웃된다. 한 화면에서 API 를 2개 이상 부를 때 실제로 발생한다.
 *
 * 진행 중인 Promise 를 여기에 담아, 재발급은 1회만 호출하고 나머지는 결과를 함께 기다린다.
 * 모듈 스코프이므로 탭 간에는 공유되지 않는다 (docs/12-decisions.md §15 한계).
 */
let refreshing: Promise<TokenPair> | null = null

/**
 * 재발급 인터셉터를 만든다.
 *
 * axios 인스턴스를 **인자로 받는다.** 여기서 instance 를 직접 import 하면
 * instance.ts -> refresh.ts -> instance.ts 로 순환 참조가 된다.
 */
export function createRefreshInterceptor(client: AxiosInstance) {
  async function requestNewTokens(): Promise<TokenPair> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw new Error('refresh token 이 없어 재발급할 수 없습니다.')

    const response = await client.post<TokenPair>('/api/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  }

  return async function refreshInterceptor(error: unknown): Promise<AxiosResponse> {
    if (!isApiError(error) || error.code !== RESULT_CODE.unauthorized) throw error

    const config = error.config
    if (!config || isAuthPath(config.url) || config._retried) throw error

    try {
      refreshing ??= requestNewTokens()
      const tokens = await refreshing
      saveTokens(tokens.access_token, tokens.refresh_token)
    } catch {
      // 재발급이 최종 실패했다. 토큰만 지우면 저장소가 구독자에게 알려
      // AuthContext 가 로그아웃 상태로 전환한다 (docs/12-decisions.md §17).
      // 여기서 AuthContext 를 직접 부르지 않는 이유도 순환 참조 때문이다.
      clearTokens()
      throw error
    } finally {
      refreshing = null
    }

    // 원래 요청을 1회만 재시도한다. 요청 인터셉터가 새 토큰을 다시 붙인다.
    // client(config) 대신 client.request 를 쓰는 이유는, 인스턴스 호출 시그니처가
    // (url, config) 와 (config) 두 가지라 객체 리터럴이 url 쪽 오버로드와 대조되기 때문이다.
    return client.request<unknown, AxiosResponse>({ ...config, _retried: true })
  }
}

function isAuthPath(url: string | undefined): boolean {
  return url !== undefined && AUTH_PATHS.some((path) => url.endsWith(path))
}
