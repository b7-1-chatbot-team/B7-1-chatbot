import type { ReactNode } from 'react'

import styles from './Alert.module.css'

interface AlertProps {
  tone: 'success' | 'error'
  children: ReactNode
  /** 문구 오른쪽에 붙는 동작 버튼 (예: 다시 불러오기 아이콘) */
  action?: ReactNode
}

/**
 * 안내 박스. 성공은 청록, 오류는 주황 (docs/05-ui-ux.md 6절).
 *
 * 사용자에게는 **문구만** 보여준다. 결과 코드(401·504 등)와 구분 이름은 사용자에게 필요 없는
 * 정보라 표시하지 않는다 (2026-09-29 결정). 코드는 개발자도구 네트워크 탭과 관리자 화면에서 본다.
 *
 * 성공은 status(조용히 읽음), 오류는 alert(바로 읽음).
 */
export function Alert({ tone, children, action }: AlertProps) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`${styles.alert} ${styles[tone]}`}>
      {action ? (
        <div className={styles.row}>
          <span>{children}</span>
          {action}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
