import { createContext } from 'react'

import type { AuthContextValue } from './types'

/**
 * 인증 상태 Context.
 *
 * Provider(AuthProvider.tsx)와 파일을 나눈 이유는, 컴포넌트와 그 외 값을 한 파일에서
 * 함께 내보내면 react-refresh 규칙(react/only-export-components)에 걸리기 때문이다.
 *
 * 기본값을 null 로 두어 Provider 밖에서 쓰면 useAuth 가 오류를 던지게 한다.
 * 빈 객체를 기본값으로 주면 잘못된 위치에서 쓴 것을 알아채지 못한다.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
