import { delay, http, HttpResponse } from 'msw'
import { beforeAll, describe, expect, it } from 'vitest'

import { server } from '@/test/server'
import { getAccessToken, getRefreshToken, saveTokens } from '@/utils/tokenStorage'
import type { ApiError } from '../ApiError'
import { instance } from '../instance'
import { RESULT_CODE } from '../types'

const BASE = 'https://api.test'

beforeAll(() => {
  instance.defaults.baseURL = BASE
})

/** 재발급 API 핸들러. 호출 횟수를 세고, 회전된 새 토큰을 돌려준다 */
function mockRefresh(options: { fail?: boolean; delayMs?: number } = {}) {
  const calls = { count: 0 }
  server.use(
    http.post(`${BASE}/api/auth/refresh`, async () => {
      calls.count += 1
      if (options.delayMs) await delay(options.delayMs)
      if (options.fail) {
        return HttpResponse.json({ code: 401, data: { message: '로그인이 필요합니다.' } })
      }
      return HttpResponse.json({
        code: 200,
        data: {
          access_token: `access-${calls.count + 1}`,
          refresh_token: `refresh-${calls.count + 1}`,
          token_type: 'bearer',
          expires_in: 900,
          refresh_expires_in: 86_400,
        },
      })
    }),
  )
  return calls
}

/** 첫 호출은 401, 그 뒤부터는 성공하는 보호된 엔드포인트 */
function mockProtectedOnce(path: string) {
  let called = 0
  server.use(
    http.get(`${BASE}${path}`, () => {
      called += 1
      if (called === 1) {
        return HttpResponse.json({ code: 401, data: { message: '로그인이 필요합니다.' } })
      }
      return HttpResponse.json({ code: 200, data: { ok: true, attempt: called } })
    }),
  )
}

describe('refresh — 재발급 후 재시도', () => {
  it('401 을 받으면 재발급하고 원래 요청을 다시 보낸다', async () => {
    saveTokens('access-1', 'refresh-1')
    const refreshCalls = mockRefresh()
    mockProtectedOnce('/api/me/chats')

    const res = await instance.get('/api/me/chats')

    expect(res.data).toEqual({ ok: true, attempt: 2 })
    expect(refreshCalls.count).toBe(1)
  })

  it('회전된 새 토큰 두 개를 저장한다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockRefresh()
    mockProtectedOnce('/api/me/chats')

    await instance.get('/api/me/chats')

    expect(getAccessToken()).toBe('access-2')
    expect(getRefreshToken()).toBe('refresh-2')
  })

  it('재시도 요청에는 새 access token 이 붙는다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockRefresh()

    const headers: (string | null)[] = []
    let called = 0
    server.use(
      http.get(`${BASE}/api/auth/me`, ({ request }) => {
        called += 1
        headers.push(request.headers.get('Authorization'))
        if (called === 1) {
          return HttpResponse.json({ code: 401, data: { message: '로그인이 필요합니다.' } })
        }
        return HttpResponse.json({ code: 200, data: {} })
      }),
    )

    await instance.get('/api/auth/me')

    expect(headers).toEqual(['Bearer access-1', 'Bearer access-2'])
  })
})

describe('refresh — single-flight', () => {
  it('동시에 401 을 받은 요청이 3건이어도 재발급은 1번만 호출한다', async () => {
    saveTokens('access-1', 'refresh-1')
    const refreshCalls = mockRefresh({ delayMs: 20 })

    const counters: Record<string, number> = { a: 0, b: 0, c: 0 }
    for (const key of ['a', 'b', 'c']) {
      server.use(
        http.get(`${BASE}/api/${key}`, () => {
          counters[key] += 1
          if (counters[key] === 1) {
            return HttpResponse.json({ code: 401, data: { message: '로그인이 필요합니다.' } })
          }
          return HttpResponse.json({ code: 200, data: { key } })
        }),
      )
    }

    const results = await Promise.all([
      instance.get('/api/a'),
      instance.get('/api/b'),
      instance.get('/api/c'),
    ])

    expect(refreshCalls.count).toBe(1)
    expect(results.map((r) => r.data)).toEqual([{ key: 'a' }, { key: 'b' }, { key: 'c' }])
  })
})

describe('refresh — 실패와 제외 조건', () => {
  it('재발급이 실패하면 토큰을 지우고 원래 오류를 그대로 던진다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockRefresh({ fail: true })
    mockProtectedOnce('/api/me/chats')

    const error = (await instance.get('/api/me/chats').catch((e: unknown) => e)) as ApiError

    expect(error.code).toBe(RESULT_CODE.unauthorized)
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('refresh token 이 없으면 재발급을 시도하지 않는다', async () => {
    const refreshCalls = mockRefresh()
    mockProtectedOnce('/api/me/chats')

    const error = (await instance.get('/api/me/chats').catch((e: unknown) => e)) as ApiError

    expect(error.code).toBe(RESULT_CODE.unauthorized)
    expect(refreshCalls.count).toBe(0)
  })

  it('로그인 API 의 401 은 재발급 대상이 아니다', async () => {
    saveTokens('access-1', 'refresh-1')
    const refreshCalls = mockRefresh()
    server.use(
      http.post(`${BASE}/api/auth/login`, () =>
        HttpResponse.json({
          code: 401,
          data: { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        }),
      ),
    )

    const error = (await instance
      .post('/api/auth/login', {})
      .catch((e: unknown) => e)) as ApiError

    expect(error.message).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    expect(refreshCalls.count).toBe(0)
  })

  it('재시도한 요청이 다시 401 이어도 또 재발급하지 않는다', async () => {
    saveTokens('access-1', 'refresh-1')
    const refreshCalls = mockRefresh()
    server.use(
      http.get(`${BASE}/api/always401`, () =>
        HttpResponse.json({ code: 401, data: { message: '로그인이 필요합니다.' } }),
      ),
    )

    const error = (await instance.get('/api/always401').catch((e: unknown) => e)) as ApiError

    expect(error.code).toBe(RESULT_CODE.unauthorized)
    expect(refreshCalls.count).toBe(1)
  })

  it('401 이 아닌 실패는 재발급을 거치지 않는다', async () => {
    saveTokens('access-1', 'refresh-1')
    const refreshCalls = mockRefresh()
    server.use(
      http.post(`${BASE}/api/chat`, () =>
        HttpResponse.json({ code: 504, data: { message: '현재 응답이 지연되고 있어요.' } }),
      ),
    )

    const error = (await instance.post('/api/chat', {}).catch((e: unknown) => e)) as ApiError

    expect(error.code).toBe(RESULT_CODE.aiTimeout)
    expect(refreshCalls.count).toBe(0)
  })
})
