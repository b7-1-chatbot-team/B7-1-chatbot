import { instance } from './instance'
import type {
  AdminFailure,
  AdminStats,
  AdminUser,
  AdminUserChats,
  AdminUserQuery,
  PageQuery,
  PageResult,
  RequestLogs,
} from './types'

/**
 * 관리자 API (docs/03-api.md 4절).
 *
 * 권한은 서버가 매 요청 DB 의 role 로 판단한다. 관리자가 아니면 code 403 이 오고
 * ApiError 로 던져진다. 프론트의 관리자 주소 숨김은 탐색을 줄이는 장치일 뿐이다.
 */

/** 전체 요약 통계 */
export async function getAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  const response = await instance.get<AdminStats>('/api/admin/stats', {
    signal,
  })
  return response.data
}

/** 사용자 목록. q 가 비어 있으면 보내지 않는다 — 빈 검색어와 검색 안 함을 구분하지 않기 위해서다 */
export async function getAdminUsers(
  query: AdminUserQuery = {},
  signal?: AbortSignal,
): Promise<PageResult<AdminUser>> {
  const { q, limit = 20, offset = 0 } = query
  const response = await instance.get<PageResult<AdminUser>>('/api/admin/users', {
    params: { ...(q ? { q } : {}), limit, offset },
    signal,
  })
  return response.data
}

/** 사용자별 대화 기록 (성공·실패 모두, 최신순) */
export async function getAdminUserChats(
  userId: number,
  query: PageQuery = {},
  signal?: AbortSignal,
): Promise<AdminUserChats> {
  const { limit = 20, offset = 0 } = query
  const response = await instance.get<AdminUserChats>(`/api/admin/users/${userId}/chats`, {
    params: { limit, offset },
    signal,
  })
  return response.data
}

/** AI 실패 기록 (최신순) */
export async function getAdminFailures(
  query: PageQuery = {},
  signal?: AbortSignal,
): Promise<PageResult<AdminFailure>> {
  const { limit = 20, offset = 0 } = query
  const response = await instance.get<PageResult<AdminFailure>>('/api/admin/failures', {
    params: { limit, offset },
    signal,
  })
  return response.data
}

/** 한 요청의 처리 흐름 (시간순) */
export async function getRequestLogs(requestId: string, signal?: AbortSignal): Promise<RequestLogs> {
  const response = await instance.get<RequestLogs>(
    `/api/admin/requests/${encodeURIComponent(requestId)}/logs`,
    { signal },
  )
  return response.data
}
