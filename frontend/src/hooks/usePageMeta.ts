import { useEffect } from 'react'

const SITE_NAME = 'Chatlog'

interface PageMeta {
  /** 화면 이름. 탭에는 "로그인 · Chatlog" 처럼 보인다 */
  title: string
  /**
   * 검색 결과에 넣지 않는다. 로그인해야 보이는 화면·관리자·404 가 해당한다.
   * robots.txt 로 막으면 주소가 목록에 드러나므로(특히 관리자 주소) 화면마다 meta 로 막는다
   */
  noindex?: boolean
}

/**
 * 화면별 제목과 검색 색인 여부 (docs/05-ui-ux.md 8절 SEO).
 *
 * SPA 라 index.html 의 <title> 하나를 모든 화면이 공유한다. 화면이 바뀔 때마다 바꿔야
 * 브라우저 탭·방문 기록·검색 결과에서 화면을 구분할 수 있다.
 */
export function usePageMeta({ title, noindex = false }: PageMeta) {
  useEffect(() => {
    document.title = `${title} · ${SITE_NAME}`

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta')
        robots.name = 'robots'
        document.head.appendChild(robots)
      }
      robots.content = 'noindex, nofollow'
    } else {
      robots?.remove()
    }
  }, [title, noindex])
}
