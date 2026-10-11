import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Button.module.css'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  /** primary: 화면의 주 동작(로그인·전송) / secondary: 그 외 / ghost: 배경 없는 아이콘 버튼 */
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
  /** 가로를 꽉 채운다 (폼 제출 버튼) */
  block?: boolean
  /** 글자 앞에 붙는 아이콘 */
  icon?: IconName
  /**
   * 아이콘만 보이는 버튼의 이름. 주면 글자 없이 아이콘만 그리고, 이 값을 aria-label 과
   * 툴팁(title)으로 쓴다. 새로고침처럼 흔한 동작은 아이콘이 더 빨리 읽힌다
   */
  label?: string
  /** 제출 중인가. true 면 버튼을 잠그고 스피너와 문구로 바꾼다 */
  isLoading?: boolean
  /** 제출 중에 보여줄 문구. 아이콘 버튼은 스피너만 보인다 */
  loadingLabel?: string
}

/**
 * 버튼.
 *
 * 제출 중 잠금을 컴포넌트가 맡는다. 화면마다 disabled 를 직접 다루면
 * 한 곳이라도 빠졌을 때 중복 제출이 발생한다.
 * useSubmit 이 ref 로도 막지만, 버튼이 눌리는 것 자체를 막아야 사용자가 상태를 안다.
 *
 * 모양 6가지(기본·hover·누름·포커스·비활성·로딩)는 Button.module.css 와 global.css 가 맡는다.
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  block = false,
  icon,
  label,
  isLoading = false,
  loadingLabel = '처리 중…',
  disabled,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const iconOnly = label !== undefined
  const classes = [
    styles.button,
    variant === 'primary' ? styles.primary : '',
    variant === 'ghost' ? styles.ghost : '',
    size === 'sm' ? styles.small : '',
    block ? styles.block : '',
    iconOnly ? styles.iconOnly : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = isLoading ? (
    <>
      <Spinner inherit />
      {iconOnly ? null : loadingLabel}
    </>
  ) : (
    <>
      {icon ? <Icon name={icon} size={size === 'sm' ? 'var(--icon-sm)' : 'var(--icon-md)'} /> : null}
      {iconOnly ? null : children}
    </>
  )

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      // 로딩 중에는 호출한 쪽이 disabled 를 false 로 넘겨도 잠근다
      disabled={Boolean(disabled) || isLoading}
      aria-busy={isLoading || undefined}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      {content}
    </button>
  )
}
