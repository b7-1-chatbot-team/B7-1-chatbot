// toBeDisabled·toHaveFocus 같은 DOM 단언을 expect 에 추가한다
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from './server'

// 등록하지 않은 요청이 실제 네트워크로 나가면 테스트가 조용히 통과할 수 있으므로 오류로 처리한다
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  // 렌더한 컴포넌트를 정리한다. globals: false 라 RTL 의 자동 정리가 동작하지 않아 직접 호출한다
  cleanup()
  // 토큰 저장소가 localStorage 를 쓰므로 테스트 간 상태가 새지 않도록 비운다
  localStorage.clear()
})

afterAll(() => server.close())
