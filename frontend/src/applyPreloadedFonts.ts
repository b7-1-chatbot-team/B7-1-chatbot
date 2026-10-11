/**
 * index.html 이 미리 받아 둔(preload) 폰트 CSS 를 stylesheet 로 적용한다.
 *
 * 전에는 `<link rel="preload" onload="this.rel='stylesheet'">` 처럼 HTML 안의 인라인 스크립트로 바꿨다.
 * 보안 헤더 CSP(script-src 'self')는 인라인 스크립트를 실행하지 않으므로 이 파일(번들)에서 한다.
 * 같은 주소라 preload 로 받아 둔 응답을 그대로 쓴다 — 다시 내려받지 않는다.
 */
export function applyPreloadedFonts(doc: Document = document): void {
  for (const preload of doc.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="style"]')) {
    const stylesheet = doc.createElement('link')
    stylesheet.rel = 'stylesheet'
    stylesheet.href = preload.href
    doc.head.append(stylesheet)
  }
}
