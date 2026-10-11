import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import SignupPage from '@/pages/SignupPage'
import { GuestOnly, RequireAdmin, RequireAuth } from './guards'
import { ADMIN_PATH, PATHS } from './paths'

/**
 * 로그인해야 쓰는 화면은 **그 화면에 갈 때 코드를 받는다** (빌드하면 파일이 나뉜다).
 * 로그인·회원가입·404 는 첫 방문자가 바로 보는 작은 화면이라 그대로 둔다.
 * 관리자 화면은 RequireAdmin 이 비관리자에게 404 를 먼저 그리므로, 일반 사용자는 이 코드를 받지 않는다.
 *
 * 받는 동안의 표시와 받기 실패는 레이아웃(AppLayout)의 Suspense·ErrorBoundary 가 맡는다.
 * 주의: 이 화면 파일을 다른 곳에서 평범하게 import 하면 나누기가 무효가 된다 (빌드 경고로 알 수 있다)
 */
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'))
const LogsPage = lazy(() => import('@/pages/logs/LogsPage'))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'))

/**
 * 라우트 정의 (docs/05-ui-ux.md 2절)
 *
 * | 경로     | 화면        | 접근 |
 * |----------|-------------|------|
 * | /        | (이동)      | 챗으로 보낸다. 비로그인이면 챗의 가드가 다시 로그인으로 보낸다 |
 * | /login   | 로그인      | 게스트 전용 |
 * | /signup  | 회원가입    | 게스트 전용 |
 * | /chat    | 챗          | 로그인 필수 |
 * | /logs    | 내 대화 로그 | 로그인 필수 |
 * | (환경변수) | 관리자    | 관리자 필수 — 주소는 VITE_ADMIN_PATH |
 *
 * 미정의 경로는 404 화면을 보여준다. 관리자가 아닌 사람의 관리자 주소 접근도 같은 404 다.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* 배포 주소를 그대로 열면 오는 곳. 경로가 없으면 404 가 떠 첫인상과 검색 결과가 404 가 된다 */}
      <Route path="/" element={<Navigate to={PATHS.chat} replace />} />
      <Route
        path={PATHS.login}
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path={PATHS.signup}
        element={
          <GuestOnly>
            <SignupPage />
          </GuestOnly>
        }
      />
      <Route
        path={PATHS.chat}
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
      <Route
        path={PATHS.logs}
        element={
          <RequireAuth>
            <LogsPage />
          </RequireAuth>
        }
      />
      {/* 관리자 주소가 설정됐을 때만 등록한다 (VITE_ADMIN_PATH) */}
      {ADMIN_PATH ? (
        <Route
          path={ADMIN_PATH}
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
      ) : null}
      {/* 없는 주소는 404. 다른 화면으로 보내지 않아 사용자가 주소를 잘못 쳤음을 알 수 있다 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
