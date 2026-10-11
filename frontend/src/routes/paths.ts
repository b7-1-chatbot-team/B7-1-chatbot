// 경로 상수 — 화면·가드·네비게이션에서 문자열을 직접 쓰지 않고 이 값을 사용한다 (docs/05-ui-ux.md 2절)
// 관련 타입은 ./types.ts 참고
export const PATHS = {
  login: '/login',
  signup: '/signup',
  chat: '/chat',
  logs: '/logs',
} as const

/**
 * 관리자 화면 주소. **환경변수 VITE_ADMIN_PATH 로만 지정하고 값을 코드·문서에 두지 않는다.**
 * /admin 처럼 짐작하기 쉬운 주소는 찔러보기 좋은 표적이 된다.
 *
 * 다만 번들을 뒤지면 주소는 보이므로 이것은 "숨김"이 아니라 무작위 탐색을 줄이는 장치다.
 * 권한 검사는 서버 require_admin 이 최종이다.
 *
 * 값이 없으면 관리자 라우트를 등록하지 않는다.
 */
export const ADMIN_PATH: string | null = toAdminPath(import.meta.env.VITE_ADMIN_PATH)

function toAdminPath(raw: string | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  return value.startsWith('/') ? value : `/${value}`
}
