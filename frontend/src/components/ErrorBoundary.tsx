import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { Button } from './Button'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
  /** 바뀌면 오류 상태를 푼다 — 보통 현재 주소 */
  resetKey?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  /** 오류가 났을 때의 resetKey. 달라지면 다른 화면으로 옮겨 간 것이다 */
  errorKey?: string
}

/**
 * 화면 코드에서 예외가 나면 흰 화면 대신 안내를 보여준다.
 *
 * 레이아웃 안(헤더 아래)에 둬서 헤더와 메뉴는 그대로 남는다 — 다른 화면으로 옮겨 갈 수 있다.
 * 주소가 바뀌면 오류 상태를 풀어 이동한 화면을 다시 그린다 (resetKey).
 * React 는 오류 경계를 클래스 컴포넌트로만 만들 수 있다.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true }
  }

  // 오류가 난 화면의 주소를 기억해 두고, 주소가 바뀌면 안내를 푼다 (렌더 전에 판단해 한 번만 그린다)
  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
    if (!state.hasError) return { errorKey: props.resetKey }
    if (state.errorKey !== props.resetKey) return { hasError: false, errorKey: props.resetKey }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 운영에서 오류를 모을 도구(Sentry 등)를 붙이면 여기서 보낸다. 지금은 개발자도구에만 남긴다
    console.error('화면 오류', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <section className={styles.page} role="alert">
        <h1 className={styles.title}>문제가 생겼습니다</h1>
        <p className={styles.description}>화면을 그리는 중 오류가 났습니다. 새로고침하면 대부분 해결됩니다.</p>
        <Button icon="refresh" label="새로고침" onClick={() => window.location.reload()} />
      </section>
    )
  }
}
