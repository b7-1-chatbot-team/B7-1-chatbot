import { Link } from 'react-router-dom'

import { usePageMeta } from '@/hooks/usePageMeta'
import { PATHS } from '@/routes/paths'
import styles from './NotFoundPage.module.css'

/**
 * 404 화면.
 *
 * 없는 주소와, 관리자가 아닌 사람이 관리자 주소로 왔을 때 **같은 화면**을 보여준다.
 * 둘을 조금이라도 다르게 보여주면 "이 주소에 무언가 있다"는 것이 드러난다.
 * 그래서 로그인 상태나 권한을 짐작하게 하는 문구를 넣지 않고, 주소도 바꾸지 않는다.
 */
export default function NotFoundPage() {
  usePageMeta({ title: '페이지를 찾을 수 없음', noindex: true })
  return (
    <section className={styles.page}>
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 className={styles.title}>404 Not Found</h1>
      <p className={styles.description}>요청하신 페이지를 찾을 수 없습니다.</p>
      {/* 로그인 상태면 GuestOnly 가 다시 챗으로 넘긴다. 상태에 따라 링크를 바꾸지 않는다 */}
      <Link to={PATHS.login} className={styles.home}>
        첫 화면으로 돌아가기
      </Link>
    </section>
  )
}
