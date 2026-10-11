/** 관리자 화면 배치 — 화면 폭에 따라 달라지는 값 (docs/05-ui-ux.md 화면 5) */

/** 목록과 대화가 위아래로 쌓이는 폭 (Admin.module.css 의 900px 와 같다) */
const STACKED_QUERY = '(max-width: 900px)'
/** 한 번에 불러오는 사용자 수 — 태블릿·모바일은 목록 아래 대화가 붙어 더 적게 */
export const USER_PAGE_SIZE = { wide: 10, stacked: 5 } as const

/** 목록과 대화가 위아래로 쌓이는 화면인가 (태블릿·모바일) */
export function isStackedLayout() {
  return typeof window.matchMedia === 'function' && window.matchMedia(STACKED_QUERY).matches
}
