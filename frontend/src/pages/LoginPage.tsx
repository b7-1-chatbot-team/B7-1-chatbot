import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { RESULT_CODE } from '@/api/types'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { useAuth } from '@/hooks/useAuth'
import { useField } from '@/hooks/useField'
import { useSubmit } from '@/hooks/useSubmit'
import { PATHS } from '@/routes/paths'
import { validateEmail, validateLoginPassword } from '@/utils/validators'

interface LoginLocationState {
  /** RequireAuth 가 넘긴, 원래 가려던 경로 */
  from?: { pathname?: string }
  /** 회원가입에서 넘어온 이메일 */
  signedUpEmail?: string
}

/**
 * 로그인 화면 (docs/05-ui-ux.md 화면 2).
 *
 * 로그인 API 의 401 은 전역 로그아웃이 아니라 **이 폼에서만** 처리한다.
 * 인터셉터도 인증 API 의 401 은 재발급 대상에서 제외한다.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const state = (location.state ?? {}) as LoginLocationState
  const signedUpEmail = state.signedUpEmail

  const email = useField({ initialValue: signedUpEmail ?? '', validate: validateEmail })
  const password = useField({ validate: validateLoginPassword })

  const { submit, isSubmitting, error } = useSubmit(login)

  const canSubmit = email.isValid && password.isValid

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    // 성공 여부는 반환값으로 판단한다. login 은 성공 시 void 라 값으로는 구분할 수 없고,
    // error 상태는 이전 렌더의 값이라 방금 실패를 알아채지 못한다
    const result = await submit(email.value.trim(), password.value)

    if (!result.ok) {
      // 비밀번호가 틀렸으니 그 필드만 비운다. 이메일까지 지우면 다시 입력해야 한다
      if (result.error?.code === RESULT_CODE.unauthorized) password.setValue('')
      return
    }

    // 원래 가려던 경로가 있으면 그곳으로, 없으면 챗으로
    navigate(state.from?.pathname ?? PATHS.chat, { replace: true })
  }

  return (
    <main>
      <h1>로그인</h1>
      <p>챗봇 질문·응답 기능은 로그인한 사용자만 사용할 수 있습니다.</p>

      {signedUpEmail ? <p role="status">가입이 완료되었습니다. 로그인해 주세요.</p> : null}

      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="이메일"
          field={email}
          type="email"
          autoComplete="email"
          placeholder="user@example.com"
        />
        <Field label="비밀번호" field={password} type="password" autoComplete="current-password" />

        {error ? <p role="alert">{error.message}</p> : null}

        <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit || isSubmitting}>
          로그인
        </Button>
      </form>

      <p>
        아직 계정이 없나요? <Link to={PATHS.signup}>회원가입</Link>
      </p>
    </main>
  )
}
