import { Link, NavLink, useNavigate } from 'react-router-dom'

import { Button } from '@/components/Button'
import { ToastRegion } from '@/components/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useSubmit } from '@/hooks/useSubmit'
import { useToast } from '@/hooks/useToast'
import { ADMIN_PATH, PATHS } from '@/routes/paths'
import styles from './Header.module.css'

/**
 * 공통 헤더 (docs/05-ui-ux.md 3절).
 *
 * 인증 상태와 권한에 따라 계정 영역과 관리자 탭이 달라진다 — 평가 항목 "로그인/비로그인에 따라 보이는 메뉴 구분".
 *
 * **관리자 탭을 숨기는 것은 화면 편의일 뿐이다.** 권한 검사는 서버 require_admin 이 최종이며,
 * 탭이 없어도 주소를 직접 입력하면 가드와 서버가 막는다.
 */
export function Header() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const { submit, isSubmitting } = useSubmit(logout)
  const showToast = useToast()

  const handleLogout = async () => {
    // 응답과 관계없이 토큰은 지워진다 (AuthProvider.logout, docs/03-api.md 1-5절).
    // 네트워크 오류로 실패해도 로그인 화면으로 보낸다
    await submit()
    navigate(PATHS.login, { replace: true })
    // 화면이 로그인으로 바뀌어 무슨 일이 있었는지 짧게 알린다
    showToast('로그아웃되었습니다.')
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={status === 'authenticated' ? PATHS.chat : PATHS.login} className={styles.brand}>
          {/* 말풍선 마크는 장식이다. 링크 이름은 "Chatlog" (favicon 과 같은 글리프) */}
          <span className={styles.mark} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path
                fill="currentColor"
                d="M4.5 4.5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9.9l-3.1 2.3a.6.6 0 0 1-.96-.48V13.5H4.5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z"
              />
              <circle cx="7" cy="9" r="1.1" fill="var(--bg-bubble-user)" />
              <circle cx="10" cy="9" r="1.1" fill="var(--bg-bubble-user)" />
              <circle cx="13" cy="9" r="1.1" fill="var(--bg-bubble-user)" />
            </svg>
          </span>
          Chatlog
        </Link>

        {/*
          메뉴는 로그인했거나 확인 중일 때 그린다. 확인 중은 저장된 토큰이 있을 때뿐이라(AuthProvider)
          대부분 로그인 상태다 — 새로고침할 때 메뉴가 늦게 나타나지 않게 먼저 그린다.
          관리자 탭·닉네임·[로그아웃]은 확인이 끝난 뒤 채운다. 비로그인은 메뉴 없이 [로그인]만
        */}
        {status !== 'anonymous' ? (
          <nav aria-label="주 메뉴" className={styles.nav}>
            <NavLink to={PATHS.chat}>챗</NavLink>
            <NavLink to={PATHS.logs}>내 대화 로그</NavLink>
            {status === 'authenticated' && user?.role === 'admin' && ADMIN_PATH ? (
              <NavLink to={ADMIN_PATH}>관리자</NavLink>
            ) : null}
          </nav>
        ) : null}
        {/* 계정 영역은 늘 그리고 버튼 높이만큼 자리를 잡는다 — 확인 중 비어 있어도 헤더 높이가 같다 */}
        <div className={styles.account}>
          {status === 'authenticated' && user ? (
            <>
              {/* 이메일은 노출하지 않고 닉네임만 보여준다. 20자라도 줄이 넘치지 않게 말줄임 */}
              <span className={styles.nickname} title={user.nickname}>
                {user.nickname}
              </span>
              <Button size="sm" onClick={handleLogout} isLoading={isSubmitting} loadingLabel="로그아웃 중…">
                로그아웃
              </Button>
            </>
          ) : null}
          {/* 회원가입은 로그인 화면 아래 안내 문장으로 이동한다. 헤더에는 로그인만 둔다 */}
          {status === 'anonymous' ? (
            <NavLink to={PATHS.login} className={styles.loginLink}>
              로그인
            </NavLink>
          ) : null}
        </div>
      </div>

      {/* 토스트는 헤더 바로 아래 가운데에 떨어져 뜬다 (docs/05-ui-ux.md 1절). 헤더가 sticky 라 스크롤해도 따라온다 */}
      <ToastRegion />
    </header>
  )
}
