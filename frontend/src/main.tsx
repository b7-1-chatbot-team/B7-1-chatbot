import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '@/store/AuthProvider'
import App from './App'
// reset 이 먼저, 그 위에 프로젝트 전역 스타일을 얹는다
import './styles/reset.css'
import './styles/global.css'

// strict 모드에서는 getElementById 가 null 을 반환할 수 있으므로 명시적으로 확인한다
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('root 엘리먼트를 찾을 수 없습니다. index.html 을 확인해 주세요.')
}

/**
 * 개발 중 API 모킹 (VITE_ENABLE_MOCK=true 일 때만).
 *
 * import.meta.env.DEV 는 빌드 시 false 로 치환되므로 이 분기 전체가 운영 번들에서 제거된다.
 * 동적 import 라 조건이 거짓이면 msw 모듈 자체를 가져오지 않는다.
 *
 * 렌더보다 먼저 워커를 기동한다. 그러지 않으면 앱이 처음 보내는 요청이 가로채이지 않는다.
 */
async function startMocking(): Promise<void> {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCK !== 'true') return

  const { worker } = await import('@/mocks/browser')
  // 등록하지 않은 요청은 그대로 통과시킨다 (정적 파일·HMR 이 막히면 안 된다)
  await worker.start({ onUnhandledRequest: 'bypass' })
}

void startMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        {/* 가드가 AuthStatus 를 읽어야 하므로 라우터 안쪽에서 인증 상태를 공급한다 */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
