import { instance } from './instance'
import type { ChatLogList, ChatLogQuery } from './types'

/**
 * 대화 로그 API (docs/03-api.md §3).
 *
 * 조회 범위는 서버가 토큰의 사용자로 강제한다. 클라이언트가 user_id 를 보내지 않는다.
 */

/**
 * 내 대화 로그. 최신순이며 성공 기록만 담긴다.
 *
 * [더 보기] 는 offset 을 이미 받은 개수만큼 올려 다시 호출한다.
 * total 과 비교해 더 받을 것이 있는지 판단한다.
 */
export async function getMyChats(
  query: ChatLogQuery = {},
  signal?: AbortSignal,
): Promise<ChatLogList> {
  const { limit = 20, offset = 0 } = query
  const response = await instance.get<ChatLogList>('/api/me/chats', {
    params: { limit, offset },
    signal,
  })
  return response.data
}
