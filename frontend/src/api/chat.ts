import { instance } from './instance'
import type { ChatRequest, ChatResponse } from './types'

/**
 * 챗 API (docs/03-api.md §2).
 *
 * AI 호출이 실패하면 서버가 자동 재시도하지 않고 즉시 504(타임아웃) 또는 502(호출 실패)를
 * 돌려준다. 재시도는 사용자가 [다시 시도] 버튼을 눌러 같은 질문으로 다시 호출하는 방식이다.
 */

/** 질문 전송. 앞뒤 공백을 제거한 1~1000자여야 하며, 위반 시 422 로 온다 */
export async function sendMessage(body: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  const response = await instance.post<ChatResponse>('/api/chat', body, { signal })
  return response.data
}
