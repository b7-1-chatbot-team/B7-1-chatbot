/**
 * 사용자 관련 공유 타입.
 * AuthContext · 헤더 · 관리자 화면이 함께 쓰므로 src/types 에 둔다 (README 타입 규칙).
 */

/** 권한. 가입으로 만들어지는 계정은 항상 user 이며 admin 은 서버 시드로만 생성된다 (docs/03-api.md §4-0) */
export type Role = 'user' | 'admin'

/** 화면에 노출해도 되는 사용자 정보. 비밀번호 해시는 어떤 응답에도 포함되지 않는다 */
export interface User {
  id: number
  email: string
  nickname: string
}
