import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import './index.css'

// strict 모드에서는 getElementById 가 null 을 반환할 수 있으므로 명시적으로 확인한다
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('root 엘리먼트를 찾을 수 없습니다. index.html 을 확인해 주세요.')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
