import { Route, Routes } from 'react-router-dom'

import AdminPage from '@/pages/AdminPage'
import ChatPage from '@/pages/ChatPage'
import LoginPage from '@/pages/LoginPage'
import LogsPage from '@/pages/LogsPage'
import NotFoundPage from '@/pages/NotFoundPage'
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
 * 미정의 경로는 404 화면을 보여준다. 관리자가 아닌 사람의 관리자 주소 접근도 같은 404 다.
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
