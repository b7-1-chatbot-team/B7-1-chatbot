import { useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { RESULT_CODE } from '@/api/types'
import { signup } from '@/api/auth'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { useField } from '@/hooks/useField'
import { useSubmit } from '@/hooks/useSubmit'
import { PATHS } from '@/routes/paths'
import { validateEmail, validateNickname, validatePassword } from '@/utils/validators'

/**
 * 회원가입 화면 (docs/05-ui-ux.md 화면 1).
 *
 * 클라이언트 검증을 통과해야 요청을 보낸다. 서버가 거절하면(409·422) 그 문구를 그대로 보여준다.
 */
export default function SignupPage() {
  const navigate = useNavigate()
  const emailInputRef = useRef<HTMLInputElement>(null)

  const email = useField({ validate: validateEmail })
  const password = useField({ validate: validatePassword })
  const nickname = useField({ validate: validateNickname })

  const { submit, isSubmitting, error } = useSubmit(signup)

  const canSubmit = email.isValid && password.isValid && nickname.isValid

  // 이메일 중복은 이메일 필드의 문제다. 폼 전체 오류로 두면 어디를 고쳐야 할지 알기 어렵다
  useEffect(() => {
    if (error?.code !== RESULT_CODE.conflict) return
    email.setServerError(error.message)
    emailInputRef.current?.focus()
  }, [error, email])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    const created = await submit({
      email: email.value.trim(),
      password: password.value,
      nickname: nickname.value.trim(),
    })
    if (!created) return

    // 방금 가입한 이메일을 로그인 화면에 넘겨 다시 입력하지 않게 한다
    navigate(PATHS.login, { replace: true, state: { signedUpEmail: created.email } })
  }

  return (
    <main>
      <h1>회원가입</h1>

      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="이메일"
          field={email}
          ref={emailInputRef}
          type="email"
          autoComplete="email"
          placeholder="user@example.com"
        />
        <Field
          label="비밀번호"
          field={password}
          type="password"
          autoComplete="new-password"
          hint="8자 이상"
        />
        <Field label="닉네임" field={nickname} autoComplete="nickname" hint="1~20자, 중복 가능" />

        {/* 이메일 중복은 위 필드에서 안내하므로 여기서 다시 보여주지 않는다 */}
        {error && error.code !== RESULT_CODE.conflict ? <p role="alert">{error.message}</p> : null}

        <Button type="submit" isLoading={isSubmitting} disabled={!canSubmit || isSubmitting}>
          가입하기
        </Button>
      </form>

      <p>
        이미 계정이 있나요? <Link to={PATHS.login}>로그인</Link>
      </p>
    </main>
  )
}
