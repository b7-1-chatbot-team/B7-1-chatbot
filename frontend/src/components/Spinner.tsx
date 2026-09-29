import styles from './Spinner.module.css'

/** 도는 원. 뜻은 옆의 문구가 전하므로 스크린리더에는 숨긴다 */
export function Spinner({ inherit = false }: { inherit?: boolean }) {
  return <span className={`${styles.spinner} ${inherit ? styles.inherit : ''}`} aria-hidden="true" />
}

/**
 * 영역 로딩 — 스피너 + 문구 (예: "불러오는 중…").
 * 로딩 표시는 이 모양 하나로 통일한다 (docs/design/prototype.html 상태 모음 3번).
 */
export function LoadingStatus({ children }: { children: string }) {
  return (
    <p role="status" className={styles.status}>
      <Spinner />
      {children}
    </p>
  )
}
