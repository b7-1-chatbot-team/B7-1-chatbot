import type { ApiError } from '@/api/ApiError'

/**
 * 불러오기 실패 안내. 문구는 서버의 data.message 를 그대로 쓴다.
 * 관리자가 아니면 403 "관리자만 접근할 수 있습니다." 가 여기로 온다.
 */
export function LoadError({ what, error, onRetry }: { what: string; error: ApiError; onRetry: () => void }) {
  return (
    <p role="alert">
      {what}을(를) 불러오지 못했습니다. {error.message}{' '}
      <button type="button" onClick={onRetry}>
        다시 불러오기
      </button>
    </p>
  )
}
