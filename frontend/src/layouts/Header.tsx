import { Link, NavLink, useNavigate } from 'react-router-dom'

import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { useSubmit } from '@/hooks/useSubmit'
import { ADMIN_PATH, PATHS } from '@/routes/paths'

/**
 * 공통 헤더 (docs/05-ui-ux.md 3절).
 *
 * 인증 상태와 권한에 따라 메뉴가 달라진다 — 평가 항목 "로그인/비로그인에 따라 보이는 메뉴 구분".
 *
 * **관리자 탭을 숨기는 것은 화면 편의일 뿐이다.** 권한 검사는 서버 require_admin 이 최종이며,
 * 탭이 없어도 주소를 직접 입력하면 가드와 서버가 막는다.
 */
export function Header() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const { submit, isSubmitting } = useSubmit(logout)

  const handleLogout = async () => {
    // 응답과 관계없이 토큰은 지워진다 (AuthProvider.logout, docs/03-api.md 1-5절).
    // 네트워크 오류로 실패해도 로그인 화면으로 보낸다
    await submit()
    navigate(PATHS.login, { replace: true })
  }

  return (
    <header>
      <Link to={status === 'authenticated' ? PATHS.chat : PATHS.login}>Chatlog</Link>

      {/*
        확인 중에는 메뉴를 비워 둔다. 비로그인 메뉴를 먼저 그리면 새로고침할 때마다
        [로그인] [회원가입] 이 잠깐 보였다가 바뀐다
      */}
      {status === 'authenticated' && user ? (
        <>
          <nav aria-label="주 메뉴">
            <NavLink to={PATHS.chat}>챗</NavLink>
            <NavLink to={PATHS.logs}>내 대화 로그</NavLink>
            {user.role === 'admin' && ADMIN_PATH ? <NavLink to={ADMIN_PATH}>관리자</NavLink> : null}
          </nav>
          {/* 이메일은 노출하지 않고 닉네임만 보여준다 */}
          <span>{user.nickname}</span>
          <Button onClick={handleLogout} isLoading={isSubmitting} loadingLabel="로그아웃 중…">
            로그아웃
          </Button>
        </>
      ) : null}

      {status === 'anonymous' ? (
        <nav aria-label="계정 메뉴">
          <NavLink to={PATHS.login}>로그인</NavLink>
          <NavLink to={PATHS.signup}>회원가입</NavLink>
        </nav>
      ) : null}
    </header>
  )
}
