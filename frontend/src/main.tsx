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
