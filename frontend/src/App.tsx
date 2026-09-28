import { AppLayout } from '@/layouts/AppLayout'
import AppRoutes from '@/routes'

/**
 * 앱 틀. 공통 레이아웃을 불러와 라우트 전체를 감싼다.
 *
 * - main.tsx: 진입 — MSW 시작, 마운트, Provider(Router·Auth)
 * - App.tsx: 레이아웃
 * - routes/index.tsx: 경로 정의
 */
export default function App() {
  return (
    <AppLayout>
      <AppRoutes />
    </AppLayout>
  )
}
