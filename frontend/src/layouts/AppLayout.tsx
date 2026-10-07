import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoadingStatus } from '@/components/Spinner'
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
      {/* 키보드 사용자가 매 화면 헤더 메뉴를 다 지나지 않고 본문으로 바로 간다. Tab 을 누르면 나타난다 */}
      <a href="#main" className={styles.skip}>
        본문 바로가기
      </a>
      <Header />
      {/* 바로가기로 온 초점을 받도록 tabIndex -1 (Tab 순서에는 넣지 않는다) */}
      <main id="main" tabIndex={-1} className={styles.main}>
        {/*
          화면 코드를 받는 동안(lazy) 화면 가운데에 스피너. 헤더·메뉴는 그대로 있다.
          오류 경계가 바깥이라, 새 배포로 옛 조각 파일이 사라져 받기에 실패해도 앱 오류 화면(새로고침)이 받는다
        */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<LoadingStatus centered>화면을 불러오는 중…</LoadingStatus>}>{children}</Suspense>
        </ErrorBoundary>
      </main>
    </>
  )
}
