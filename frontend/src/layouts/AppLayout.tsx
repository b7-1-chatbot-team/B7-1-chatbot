import { Outlet } from 'react-router-dom'

import { Header } from './Header'

/**
 * 모든 화면이 공유하는 틀. 헤더 아래에 각 화면이 들어간다.
 *
 * 라우트 정의에서 레이아웃 라우트로 쓴다. 화면을 옮겨 다녀도 레이아웃은 다시
 * 마운트되지 않으므로 헤더 상태가 유지된다.
 */
export function AppLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  )
}
