import { afterEach, describe, expect, it } from 'vitest'

import { applyPreloadedFonts } from './applyPreloadedFonts'

const FONT_URL = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR&display=swap'

afterEach(() => {
  document.head.innerHTML = ''
})

describe('applyPreloadedFonts', () => {
  it('미리 받은 폰트 CSS 를 같은 주소의 stylesheet 로 적용한다', () => {
    document.head.innerHTML = `<link rel="preload" as="style" href="${FONT_URL}">`

    applyPreloadedFonts()

    const sheets = document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    expect(sheets).toHaveLength(1)
    expect(sheets[0].href).toBe(FONT_URL)
  })

  it('스타일이 아닌 preload(스크립트 등)는 건드리지 않는다', () => {
    document.head.innerHTML = '<link rel="preload" as="script" href="/a.js">'

    applyPreloadedFonts()

    expect(document.head.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(0)
  })
})
