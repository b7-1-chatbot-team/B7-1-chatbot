import { useId } from 'react'
import type { InputHTMLAttributes, Ref } from 'react'

import type { Field as FieldState } from '@/hooks/useField'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> {
  label: string
  field: FieldState
  /** 입력 아래에 상시 노출할 도움말 (예: 비밀번호는 8자 이상) */
  hint?: string
  /** 서버 오류 시 해당 입력으로 포커스를 옮기기 위해 사용한다. React 19 부터 ref 는 일반 prop 이다 */
  ref?: Ref<HTMLInputElement>
}

/**
 * 라벨 + 입력 + 오류 메시지 묶음.
 *
 * 접근성 처리를 여기 한 곳에 모은다. 화면마다 직접 쓰면 label 연결이나
 * role="alert" 를 빠뜨리기 쉽다.
 *
 * - label 과 input 을 id 로 연결한다 (useId 로 화면 안에서 고유한 값을 만든다)
 * - 오류가 있으면 aria-invalid 를 켜고 aria-describedby 로 메시지를 가리킨다
 * - 오류 메시지는 role="alert" 로 스크린 리더가 즉시 읽게 한다
 */
export function Field({ label, field, hint, ...inputProps }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [field.error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        id={id}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {hint ? <p id={hintId}>{hint}</p> : null}
      {field.error ? (
        <p id={errorId} role="alert">
          {field.error}
        </p>
      ) : null}
    </div>
  )
}
