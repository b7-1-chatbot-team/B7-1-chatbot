import axios from 'axios'

import { attachToken } from './interceptors/attachToken'
import { normalizeError, normalizeResponse } from './interceptors/normalize'

/**
 * 프로젝트 공용 axios 인스턴스.
 *
 * 이 파일에는 **기본 설정과 인터셉터 등록만** 둔다. API 호출 함수는 auth.ts·chat.ts·logs.ts 에 있다.
 *
 * 화면에서는 전역 axios 를 쓰지 않는다. 전역 axios 로 보내면 인터셉터를 우회해
 * 토큰 첨부와 응답 형식 처리가 모두 빠진다.
 */
export const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // 서버의 AI 호출 상한이 30초라(docs/03-api.md §7) 그보다 넉넉히 둔다.
  // 더 짧으면 정상 응답을 클라이언트가 먼저 끊어 버린다.
  timeout: 35_000,
})

instance.interceptors.request.use(attachToken)

// 응답 인터셉터는 등록한 순서대로 실행된다.
// 형식 정규화가 먼저 code 를 해석해야, 뒤에 붙는 재발급 인터셉터가 401 을 알아본다.
instance.interceptors.response.use(normalizeResponse, normalizeError)
