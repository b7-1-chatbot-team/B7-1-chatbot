/**
 * 토큰 저장소.
 *
 * localStorage 를 직접 만지는 곳은 이 파일 하나다 (docs/12-decisions.md 4절).
 *
 * **이 모듈은 아무것도 import 하지 않는다.** 인터셉터(api/)와 AuthContext(store/) 가
 * 모두 이 파일을 참조하는데, 여기서 다시 그쪽을 참조하면 순환 참조가 된다
 * (docs/12-decisions.md 17절).
 *
 * 값이 바뀌면 구독자에게 알린다. localStorage 는 같은 탭에서 조작해도 이벤트가
 * 발생하지 않으므로, 저장소가 직접 알리지 않으면 React 는 변화를 알 수 없다.
 * 덕분에 인터셉터는 재발급 실패 시 clearTokens() 만 호출하면 되고,
 * 화면 정리는 구독한 AuthContext 가 맡는다.
 */

const ACCESS_KEY = 'auth:access_token'
const REFRESH_KEY = 'auth:refresh_token'

/**
 * localStorage 를 쓸 수 없을 때의 대체 저장소.
 *
 * 시크릿 모드·브라우저 설정으로 저장소가 막히면 getItem/setItem 이 예외를 던진다.
 * 방어하지 않으면 로그인 순간 예외가 화면까지 퍼져 앱이 흰 화면이 된다.
 * 메모리에 두면 새로고침 후 로그인 유지만 안 될 뿐 앱은 계속 동작한다.
 */
const memory = new Map<string, string>()

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    memory.set(key, value)
  }
}

function remove(key: string): void {
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // 저장소를 쓸 수 없으면 메모리에서 지운 것으로 충분하다
  }
}

/** 토큰이 바뀌면 호출할 구독자 명단 */
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function getAccessToken(): string | null {
  // 빈 문자열은 토큰이 아니다. 그대로 두면 "있음"으로 판정되어 401 경로를 한 번 더 탄다
  return read(ACCESS_KEY) || null
}

export function getRefreshToken(): string | null {
  return read(REFRESH_KEY) || null
}

/** 토큰이 있는지만 동기로 확인한다. 라우팅 가드가 화면을 그리기 전에 판단할 때 쓴다 */
export function hasAccessToken(): boolean {
  return getAccessToken() !== null
}

/** 로그인·재발급 성공 시 호출. 재발급은 refresh token 도 회전되므로 항상 둘을 함께 저장한다 */
export function saveTokens(accessToken: string, refreshToken: string): void {
  write(ACCESS_KEY, accessToken)
  write(REFRESH_KEY, refreshToken)
  notify()
}

/** 로그아웃·재발급 실패 시 호출. 둘을 함께 지운다 */
export function clearTokens(): void {
  remove(ACCESS_KEY)
  remove(REFRESH_KEY)
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
