/**
 * 입력 검증 규칙 (docs/03-api.md §1-1).
 *
 * 회원가입과 로그인이 같은 규칙을 쓰므로 한 곳에 모은다. 화면마다 복사하면
 * 한쪽만 고쳐져 서로 어긋난다.
 *
 * **클라이언트 검증은 서버 검증의 보조다.** 여기를 통과해도 서버가 422 로 거절할 수 있고,
 * 그때는 서버가 준 문구를 그대로 보여준다.
 */

/** 서버(Pydantic EmailStr)보다 느슨하다. 오타를 걸러 불필요한 요청을 줄이는 용도다 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_MIN_LENGTH = 8
export const NICKNAME_MIN_LENGTH = 1
export const NICKNAME_MAX_LENGTH = 20

export function validateEmail(value: string): string | null {
  if (!value.trim()) return '이메일을 입력해 주세요.'
  if (!EMAIL_SHAPE.test(value)) return '이메일 형식이 올바르지 않습니다.'
  return null
}

export function validatePassword(value: string): string | null {
  if (!value) return '비밀번호를 입력해 주세요.'
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상으로 입력해 주세요.`
  }
  return null
}

export function validateNickname(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length < NICKNAME_MIN_LENGTH) return '닉네임을 입력해 주세요.'
  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`
  }
  return null
}

/** 로그인은 형식만 확인한다. 길이 규칙은 가입 시점 기준이라 기존 계정을 막을 수 있다 */
export function validateLoginPassword(value: string): string | null {
  return value ? null : '비밀번호를 입력해 주세요.'
}
