import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  /** 제출 중인가. true 면 버튼을 잠그고 문구를 바꾼다 */
  isLoading?: boolean
  /** 제출 중에 보여줄 문구 */
  loadingLabel?: string
}

/**
 * 버튼.
 *
 * 제출 중 잠금을 컴포넌트가 맡는다. 화면마다 disabled 를 직접 다루면
 * 한 곳이라도 빠졌을 때 중복 제출이 발생한다.
 * useSubmit 이 ref 로도 막지만, 버튼이 눌리는 것 자체를 막아야 사용자가 상태를 안다.
 */
export function Button({
  children,
  isLoading = false,
  loadingLabel = '처리 중…',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button {...rest} type={type} disabled={disabled ?? isLoading} aria-busy={isLoading || undefined}>
      {isLoading ? loadingLabel : children}
    </button>
  )
}
