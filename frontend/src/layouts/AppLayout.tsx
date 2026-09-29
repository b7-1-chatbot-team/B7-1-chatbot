import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import styles from './AppLayout.module.css'
import { Header } from './Header'

/**
 * 모든 화면이 공유하는 틀. 헤더 아래에 각 화면이 들어간다.
 *
 * App.tsx 가 라우트 전체를 이 레이아웃으로 감싼다. 화면을 옮겨 다녀도 레이아웃은
 * 다시 마운트되지 않으므로 헤더 상태가 유지된다.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  // 다른 화면으로 옮기면 오류 안내를 풀고 새 화면을 그린다
  const { pathname } = useLocation()
  return (
    <>
      <Header />
      <main className={styles.main}>
        <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
      </main>
    </>
  )
}
