/**
 * 토큰 저장소.
 *
 * localStorage 를 직접 만지는 곳은 이 파일 하나다 (docs/12-decisions.md §4).
 *
 * **이 모듈은 아무것도 import 하지 않는다.** 인터셉터(api/)와 AuthContext(store/) 가
 * 모두 이 파일을 참조하는데, 여기서 다시 그쪽을 참조하면 순환 참조가 된다
 * (docs/12-decisions.md §17).
 *
 * 값이 바뀌면 구독자에게 알린다. localStorage 는 같은 탭에서 조작해도 이벤트가
 * 발생하지 않으므로, 저장소가 직접 알리지 않으면 React 는 변화를 알 수 없다.
 * 덕분에 인터셉터는 재발급 실패 시 clearTokens() 만 호출하면 되고,
 * 화면 정리는 구독한 AuthContext 가 맡는다.
 */

const ACCESS_KEY = 'auth:access_token'
const REFRESH_KEY = 'auth:refresh_token'

/** 토큰이 바뀌면 호출할 구독자 명단 */
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

/** 토큰이 있는지만 동기로 확인한다. 라우팅 가드가 화면을 그리기 전에 판단할 때 쓴다 */
export function hasAccessToken(): boolean {
  return getAccessToken() !== null
}

/** 로그인·재발급 성공 시 호출. 재발급은 refresh token 도 회전되므로 항상 둘을 함께 저장한다 */
export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  notify()
}

/** 로그아웃·재발급 실패 시 호출. 둘을 함께 지운다 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  notify()
}

/**
 * 토큰 변경 구독. 해지 함수를 반환한다 (useSyncExternalStore 규약).
 *
 * storage 이벤트도 함께 듣는다. 이 이벤트는 **다른 탭**에서 localStorage 를
 * 바꿨을 때만 발생하므로, 한 탭에서 로그아웃하면 나머지 탭도 따라 정리된다.
 */
export function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ACCESS_KEY || event.key === REFRESH_KEY) onChange()
  }
  window.addEventListener('storage', handleStorage)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', handleStorage)
  }
}
