import { useCallback, useState } from 'react'
import type { ChangeEvent } from 'react'

/** 값이 올바르면 null, 아니면 사용자에게 보여줄 문구를 반환한다 */
export type FieldValidator = (value: string) => string | null

export interface UseFieldOptions {
  initialValue?: string
  validate?: FieldValidator
}

export interface Field {
  value: string
  /** 화면에 보여줄 오류. 서버 오류가 있으면 그것을, 없으면 터치 이후의 검증 실패를 준다 */
  error: string | null
  /** 한 번이라도 입력하고 포커스를 벗어났는가 */
  touched: boolean
  /** 터치 여부와 무관한 실제 유효성. 제출 버튼 활성화 판단에 쓴다 */
  isValid: boolean
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur: () => void
  setValue: (value: string) => void
  /** 서버가 돌려준 오류를 이 필드에 붙인다 (예: 409 이메일 중복) */
  setServerError: (message: string | null) => void
  reset: () => void
}

/**
 * 입력 하나의 상태를 관리한다.
 *
 * 화면마다 useState 를 늘어놓으면 "언제 오류를 보여줄지" 규칙이 화면마다 어긋난다.
 * 여기서는 **터치 이후에만** 검증 오류를 노출한다. 입력하자마자 빨간 글씨가 뜨면
 * 아직 다 치지도 않은 사용자를 나무라는 꼴이 된다.
 *
 * 서버 오류는 별도로 담는다. 값이 바뀌면 지워서, 고치는 중에 옛 오류가 남지 않게 한다.
 */
export function useField({ initialValue = '', validate }: UseFieldOptions = {}): Field {
  const [value, setValueState] = useState(initialValue)
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const validationError = validate ? validate(value) : null

  const setValue = useCallback((next: string) => {
    setValueState(next)
    // 값을 고치는 중이면 서버 오류는 더 이상 유효하지 않다
    setServerError(null)
  }, [])

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValue(event.target.value)
    },
    [setValue],
  )

  const onBlur = useCallback(() => setTouched(true), [])

  const reset = useCallback(() => {
    setValueState(initialValue)
    setTouched(false)
    setServerError(null)
  }, [initialValue])

  return {
    value,
    error: serverError ?? (touched ? validationError : null),
    touched,
    isValid: validationError === null,
    onChange,
    onBlur,
    setValue,
    setServerError,
    reset,
  }
}
