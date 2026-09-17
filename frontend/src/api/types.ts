/**
 * API 요청·응답 타입. docs/03-api.md 와 1:1 로 맞춘다.
 * 관리자 API 타입은 관리자 화면 이슈에서 추가한다.
 */
import type { Role, User } from '@/types/user'

/* ------------------------------------------------------------------ */
/* 공통 응답 형식                                                       */
/* ------------------------------------------------------------------ */

/**
 * 서버 응답의 공통 겉포장.
 *
 * 이 서버는 성공·실패 모두 **HTTP 200** 으로 응답하고 결과는 body 의 code 로만 판단한다
 * (docs/03-api.md §0). 따라서 axios 는 실패를 에러로 던지지 않으며,
 * 응답 인터셉터가 code 를 보고 ApiError 로 바꾼다.
 */
export interface ApiEnvelope<T> {
  code: number
  data: T
}

/** 실패 응답의 data. 사용자에게 보여줄 문구가 들어 있다 */
export interface ApiFailureData {
  message: string
}

/**
 * 결과 코드 (docs/03-api.md §0).
 *
 * 같은 코드 안의 원인은 **호출한 API 로 구분**한다.
 * 예: 로그인 API 의 401 은 로그인 실패, 재발급 API 의 401 은 재로그인 필요,
 * 그 외 API 의 401 은 access token 만료·없음.
 */
export const RESULT_CODE = {
  /** 서버에 닿지 못함. 서버가 준 값이 아니라 프론트가 붙이는 값이다 */
  unreachable: 0,
  ok: 200,
  created: 201,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  validationError: 422,
  internalError: 500,
  aiCallFailed: 502,
  aiTimeout: 504,
} as const

export type ResultCode = (typeof RESULT_CODE)[keyof typeof RESULT_CODE]

/* ------------------------------------------------------------------ */
/* 인증 (docs/03-api.md §1)                                            */
/* ------------------------------------------------------------------ */

/** POST /api/auth/signup — 비밀번호 8자 이상, 닉네임 1~20자(중복 허용) */
export interface SignupRequest {
  email: string
  password: string
  nickname: string
}

/** 회원가입 성공 응답 (code 201) */
export interface SignupResponse extends User {
  created_at: string
}

/** POST /api/auth/login */
export interface LoginRequest {
  email: string
  password: string
}

/** 로그인·재발급 응답. 재발급 시 refresh_token 도 새 값으로 회전된다 (docs/03-api.md §1-4) */
export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  /** access token 만료까지 남은 초 (15분 = 900) */
  expires_in: number
  /** refresh token 만료까지 남은 초 (1일 = 86400) */
  refresh_expires_in: number
}

/** POST /api/auth/refresh · POST /api/auth/logout — refresh token 은 쿠키가 아니라 body 로 보낸다 */
export interface RefreshTokenRequest {
  refresh_token: string
}

/** GET /api/auth/me — 새로고침 후 상태 복원과 관리자 메뉴 표시 판단에 사용한다 */
export interface MeResponse extends User {
  role: Role
}

/* ------------------------------------------------------------------ */
/* 챗봇 (docs/03-api.md §2)                                            */
/* ------------------------------------------------------------------ */

/** POST /api/chat — 앞뒤 공백 제거 후 1~1000자 */
export interface ChatRequest {
  message: string
}

export interface ChatResponse {
  chat_id: number
  question: string
  answer: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/* 대화 로그 (docs/03-api.md §3)                                       */
/* ------------------------------------------------------------------ */

/** GET /api/me/chats — limit 기본 20(최대 100), offset 기본 0 */
export interface ChatLogQuery {
  limit?: number
  offset?: number
}

export interface ChatLogItem {
  chat_id: number
  question: string
  answer: string
  created_at: string
}

/** total 은 해당 사용자의 전체 성공 기록 수. items 는 최신순이며 성공 기록만 담긴다 */
export interface ChatLogList {
  total: number
  items: ChatLogItem[]
}
