import type { SVGProps } from 'react'

/**
 * 아이콘 모음. 인라인 SVG 로 두어 아이콘 라이브러리를 들이지 않는다 (의존성 최소화, 05-ui-ux 2절).
 *
 * 색은 currentColor 라 버튼 글자색을 따른다. 크기는 --icon-* 토큰.
 * 아이콘은 뜻을 전하지 않는다고 보고 항상 aria-hidden 이다.
 * 이름은 아이콘을 감싼 버튼이 aria-label 로 가진다.
 */
const PATHS = {
  // 새로고침·다시 시도: 끝이 화살표인 원
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </>
  ),
} as const

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName
  /** 한 변 길이. 기본은 --icon-sm */
  size?: string
}

export function Icon({ name, size = 'var(--icon-sm)', ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      style={{ width: size, height: size, flexShrink: 0 }}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
