import { useEffect } from 'react'

const SITE_NAME = 'Chatlog'
/** 배포 주소. 없으면 canonical·og:url 을 넣지 않는다 */
const SITE_URL = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '')

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
    const fullTitle = `${title} · ${SITE_NAME}`
    document.title = fullTitle
    setMeta('property', 'og:title', fullTitle)

    // 같은 화면을 가리키는 주소가 여럿이어도(쿼리 등) 검색에는 하나로 모이게 한다.
    // 검색 제외 화면은 대표 주소가 필요 없다
    const canonical = SITE_URL && !noindex ? `${SITE_URL}${window.location.pathname}` : null
    setLink('canonical', canonical)
    setMeta('property', 'og:url', canonical)

    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : null)
  }, [title, noindex])
}

/** <meta> 를 넣거나 바꾼다. value 가 null 이면 뺀다 */
function setMeta(attribute: 'name' | 'property', key: string, value: string | null) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (value === null) {
    meta?.remove()
    return
  }
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attribute, key)
    document.head.appendChild(meta)
  }
  meta.content = value
}

function setLink(rel: string, href: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (href === null) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
}
