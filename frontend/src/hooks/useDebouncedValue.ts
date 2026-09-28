import { useEffect, useState } from 'react'

/**
 * 입력이 멈추고 delay 가 지난 뒤에야 값을 바꾼다.
 * 검색창에서 글자마다 요청하지 않도록 한다 (docs/05-ui-ux.md 화면 5 — 300ms).
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
