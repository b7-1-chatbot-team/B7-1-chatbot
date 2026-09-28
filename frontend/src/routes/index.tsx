import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/layouts/AppLayout'
import AdminPage from '@/pages/AdminPage'
import ChatPage from '@/pages/ChatPage'
import LoginPage from '@/pages/LoginPage'
import LogsPage from '@/pages/LogsPage'
import SignupPage from '@/pages/SignupPage'
import { GuestOnly, RequireAdmin, RequireAuth } from './guards'
import { ADMIN_PATH, PATHS } from './paths'

/**
 * 라우트 정의 (docs/05-ui-ux.md 2절)
 *
 * | 경로     | 화면        | 접근 |
 * |----------|-------------|------|
 * | /login   | 로그인      | 게스트 전용 |
 * | /signup  | 회원가입    | 게스트 전용 |
 * | /chat    | 챗          | 로그인 필수 |
 * | /logs    | 내 대화 로그 | 로그인 필수 |
 * | (환경변수) | 관리자    | 관리자 필수 — 주소는 VITE_ADMIN_PATH |
 *
 * 미정의 경로는 /login 으로 보낸다. 로그인 상태라면 GuestOnly 가 다시 /chat 으로
 * 넘기므로, 결과적으로 인증 상태에 맞는 화면에 도착한다.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* 모든 화면을 공통 레이아웃(헤더) 안에 둔다 */}
      <Route element={<AppLayout />}>
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
      <Route path="*" element={<Navigate to={PATHS.login} replace />} />
      </Route>
    </Routes>
  )
}
