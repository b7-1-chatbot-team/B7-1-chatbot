import { useRef } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { signup } from '@/api/auth'
import { RESULT_CODE } from '@/api/types'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { useField } from '@/hooks/useField'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useSubmit } from '@/hooks/useSubmit'
import { PATHS } from '@/routes/paths'
import styles from './AuthPage.module.css'
import {
  validateEmail, validateNickname, validatePassword,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
} from '@/utils/validators'

/**
 * 회원가입 화면 (docs/05-ui-ux.md 화면 1).
 *
 * 클라이언트 검증을 통과해야 요청을 보낸다. 서버가 거절하면(409·422) 그 문구를 그대로 보여준다.
 */
export default function SignupPage() {
  usePageMeta({ title: '회원가입' })
  const navigate = useNavigate()
  const emailInputRef = useRef<HTMLInputElement>(null)

  const email = useField({ validate: validateEmail })
  const password = useField({ validate: validatePassword })
  const nickname = useField({ validate: validateNickname })

  const { submit, isSubmitting, error } = useSubmit(signup)

  const canSubmit = email.isValid && password.isValid && nickname.isValid

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    const result = await submit({
      email: email.value.trim(),
      password: password.value,
      nickname: nickname.value.trim(),
    })

    if (!result.ok) {
      // 이메일 중복은 이메일 필드의 문제다. 폼 전체 오류로 두면 어디를 고쳐야 할지 알기 어렵다.
      // effect 가 아니라 여기서 처리한다. effect 로 두면 값을 고쳐 오류를 지워도
      // 의존성이 바뀌며 다시 실행되어 오류가 되살아난다.
      if (result.error?.code === RESULT_CODE.conflict) {
        email.setServerError(result.error.message)
        emailInputRef.current?.focus()
      }
      return
    }

    // 방금 가입한 이메일을 로그인 화면에 넘겨 다시 입력하지 않게 한다
    navigate(PATHS.login, { replace: true, state: { signedUpEmail: result.data.email } })
  }

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>회원가입</h1>
      <p className={styles.description}>이메일로 가입하고 챗봇을 사용해 보세요.</p>

      <form onSubmit={handleSubmit} noValidate className={styles.card}>
        <Field
          label="이메일"
          field={email}
          ref={emailInputRef}
          type="email"
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
          placeholder="user@example.com"
        />
        <Field
          label="비밀번호"
          field={password}
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          hint="8자 이상"
        />
        <Field label="닉네임" field={nickname} autoComplete="nickname" maxLength={NICKNAME_MAX_LENGTH} hint="1~20자, 중복 가능" />

        {/* 이메일 중복은 위 필드에서 안내하므로 여기서 다시 보여주지 않는다 */}
        {error && error.code !== RESULT_CODE.conflict ? <Alert tone="error">{error.message}</Alert> : null}

        <Button type="submit" variant="primary" block isLoading={isSubmitting} disabled={!canSubmit || isSubmitting}>
          가입하기
        </Button>

        {/* 문장 전체가 링크다. 한 단어만 누르게 하면 누를 곳이 좁다 */}
        <Link to={PATHS.login} className={styles.switch}>
          이미 계정이 있나요? <strong>로그인</strong>
        </Link>
      </form>

      <p className={styles.apiNote}>POST /api/auth/signup · 비밀번호는 bcrypt 로 해싱되어 저장됩니다</p>
    </section>
  )
}
