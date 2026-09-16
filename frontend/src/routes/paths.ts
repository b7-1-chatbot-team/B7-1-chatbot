// 경로 상수 — 화면·가드·네비게이션에서 문자열을 직접 쓰지 않고 이 값을 사용한다 (docs/05-ui-ux.md §2)
// 관련 타입은 ./types.ts 참고
export const PATHS = {
  login: '/login',
  signup: '/signup',
  chat: '/chat',
  logs: '/logs',
  admin: '/admin',
} as const
