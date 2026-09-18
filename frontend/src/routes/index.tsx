import { Navigate, Route, Routes } from 'react-router-dom'

import AdminPage from '@/pages/AdminPage'
import ChatPage from '@/pages/ChatPage'
import LoginPage from '@/pages/LoginPage'
import LogsPage from '@/pages/LogsPage'
import SignupPage from '@/pages/SignupPage'
import { GuestOnly, RequireAdmin, RequireAuth } from './guards'
import { PATHS } from './paths'

/**
 * 라우트 정의 (docs/05-ui-ux.md §2)
 *
 * | 경로     | 화면        | 접근 |
 * |----------|-------------|------|
 * | /login   | 로그인      | 게스트 전용 |
 * | /signup  | 회원가입    | 게스트 전용 |
 * | /chat    | 챗          | 로그인 필수 |
 * | /logs    | 내 대화 로그 | 로그인 필수 |
 * | /admin   | 관리자      | 관리자 필수 |
 *
 * 미정의 경로는 /login 으로 보낸다. 로그인 상태라면 GuestOnly 가 다시 /chat 으로
 * 넘기므로, 결과적으로 인증 상태에 맞는 화면에 도착한다.
 */
export default function AppRoutes() {
  return (
    <Routes>
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
      <Route
        path={PATHS.admin}
        element={
          <RequireAdmin>
            <AdminPage />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to={PATHS.login} replace />} />
    </Routes>
  )
}
