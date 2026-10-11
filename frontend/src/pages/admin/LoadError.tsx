import type { ApiError } from '@/api/ApiError'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'

/**
 * 불러오기 실패 안내. 문구는 서버의 data.message 를 그대로 쓰고 결과 코드는 붙이지 않는다.
 * 관리자가 아니면 403 "관리자만 접근할 수 있습니다." 가 여기로 온다.
 */
export function LoadError({ what, error, onRetry }: { what: string; error: ApiError; onRetry: () => void }) {
  return (
    <Alert
      tone="error"
      action={<Button variant="ghost" size="sm" icon="refresh" label="다시 불러오기" onClick={onRetry} />}
    >
      {what}을(를) 불러오지 못했습니다. {error.message}
    </Alert>
  )
}
