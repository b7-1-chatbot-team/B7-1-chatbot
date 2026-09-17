import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from './server'

/**
 * 테스트 환경 자체가 동작하는지 확인한다.
 * 실패하면 개별 테스트가 아니라 설정(vite.config.ts test, setup.ts)을 먼저 본다.
 */
describe('테스트 환경', () => {
  it('happy-dom 이 localStorage 를 제공한다', () => {
    localStorage.setItem('probe', 'value')
    expect(localStorage.getItem('probe')).toBe('value')
  })

  it('MSW 가 요청을 가로채 등록한 응답을 돌려준다', async () => {
    server.use(
      http.get('https://example.test/ping', () =>
        HttpResponse.json({ code: 200, data: { ok: true } }),
      ),
    )

    const res = await fetch('https://example.test/ping')

    expect(await res.json()).toEqual({ code: 200, data: { ok: true } })
  })

  it('alias @/ 로 모듈을 불러올 수 있다', async () => {
    const { PATHS } = await import('@/routes/paths')

    expect(PATHS.login).toBe('/login')
  })
})
