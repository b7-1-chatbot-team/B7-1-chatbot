import { Navigate, Route, Routes } from 'react-router-dom'

import AdminPage from '../pages/AdminPage'
import ChatPage from '../pages/ChatPage'
import LoginPage from '../pages/LoginPage'
import LogsPage from '../pages/LogsPage'
import SignupPage from '../pages/SignupPage'
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
 * 접근 가드(RequireAuth·RequireAdmin)는 AuthContext 가 필요하므로
 * 인증 상태 관리 이슈에서 이 파일의 각 Route 에 감싸 추가한다.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route path={PATHS.signup} element={<SignupPage />} />
      <Route path={PATHS.chat} element={<ChatPage />} />
      <Route path={PATHS.logs} element={<LogsPage />} />
      <Route path={PATHS.admin} element={<AdminPage />} />
      <Route path="*" element={<Navigate to={PATHS.login} replace />} />
    </Routes>
  )
}
