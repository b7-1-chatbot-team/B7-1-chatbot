import axios from 'axios'
import { delay, http, HttpResponse } from 'msw'
import { beforeAll, describe, expect, it } from 'vitest'

import { server } from '@/test/server'
import { saveTokens } from '@/utils/tokenStorage'
import type { ApiError } from './ApiError'
import { isApiError } from './ApiError'
import { login, logout, me, refresh, signup } from './auth'
import { sendMessage } from './chat'
import { instance } from './instance'
import { getMyChats } from './logs'
import { RESULT_CODE } from './types'

const BASE = 'https://api.test'

beforeAll(() => {
  instance.defaults.baseURL = BASE
})

const TOKENS = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  token_type: 'bearer',
  expires_in: 900,
  refresh_expires_in: 86_400,
}

describe('auth 엔드포인트', () => {
  it('signup 은 입력을 그대로 보내고 생성된 사용자를 돌려준다', async () => {
    let received: unknown = null
    server.use(
      http.post(`${BASE}/api/auth/signup`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({
          code: 201,
          data: {
            id: 1,
            email: 'user@example.com',
            nickname: '테스터',
            created_at: '2026-09-17T10:00:00+09:00',
          },
        })
      }),
    )

    const user = await signup({
      email: 'user@example.com',
      password: 'password1234',
      nickname: '테스터',
    })

    expect(received).toEqual({
      email: 'user@example.com',
      password: 'password1234',
      nickname: '테스터',
    })
    expect(user.id).toBe(1)
    expect(user.created_at).toBe('2026-09-17T10:00:00+09:00')
  })

  it('login 은 토큰 쌍을 돌려준다', async () => {
    server.use(
      http.post(`${BASE}/api/auth/login`, () => HttpResponse.json({ code: 200, data: TOKENS })),
    )

    const tokens = await login({ email: 'user@example.com', password: 'password1234' })

    expect(tokens.access_token).toBe('access-1')
    expect(tokens.refresh_expires_in).toBe(86_400)
  })

  it('refresh 는 refresh token 을 body 로 보낸다 (쿠키를 쓰지 않는다)', async () => {
    let received: unknown = null
    server.use(
      http.post(`${BASE}/api/auth/refresh`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ code: 200, data: TOKENS })
      }),
    )

    await refresh({ refresh_token: 'refresh-0' })

    expect(received).toEqual({ refresh_token: 'refresh-0' })
  })

  it('logout 은 refresh token 만 보내고 반환값이 없다', async () => {
    let received: unknown = null
    server.use(
      http.post(`${BASE}/api/auth/logout`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ code: 200, data: {} })
      }),
    )

    const result = await logout({ refresh_token: 'refresh-1' })

    expect(received).toEqual({ refresh_token: 'refresh-1' })
    expect(result).toBeUndefined()
  })

  it('me 는 role 을 포함한 사용자 정보를 돌려준다', async () => {
    saveTokens('access-1', 'refresh-1')
    server.use(
      http.get(`${BASE}/api/auth/me`, () =>
        HttpResponse.json({
          code: 200,
          data: { id: 1, email: 'admin@example.com', nickname: '관리자', role: 'admin' },
        }),
      ),
    )

    const user = await me()

    expect(user.role).toBe('admin')
  })
})

describe('chat 엔드포인트', () => {
  it('sendMessage 는 질문을 보내고 답변을 돌려준다', async () => {
    saveTokens('access-1', 'refresh-1')
    let received: unknown = null
    server.use(
      http.post(`${BASE}/api/chat`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({
          code: 200,
          data: {
            chat_id: 987,
            question: 'FastAPI에서 CORS 설정은?',
            answer: 'CORSMiddleware 를 사용합니다.',
            created_at: '2026-09-17T10:05:12+09:00',
          },
        })
      }),
    )

    const result = await sendMessage({ message: 'FastAPI에서 CORS 설정은?' })

    expect(received).toEqual({ message: 'FastAPI에서 CORS 설정은?' })
    expect(result.chat_id).toBe(987)
  })
})

describe('logs 엔드포인트', () => {
  it('getMyChats 는 기본 limit 20 · offset 0 으로 조회한다', async () => {
    saveTokens('access-1', 'refresh-1')
    let url: URL | null = null
    server.use(
      http.get(`${BASE}/api/me/chats`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({ code: 200, data: { total: 0, items: [] } })
      }),
    )

    await getMyChats()

    expect(url!.searchParams.get('limit')).toBe('20')
    expect(url!.searchParams.get('offset')).toBe('0')
  })

  it('[더 보기] 처럼 offset 을 올려 조회할 수 있다', async () => {
    saveTokens('access-1', 'refresh-1')
    let url: URL | null = null
    server.use(
      http.get(`${BASE}/api/me/chats`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json({
          code: 200,
          data: {
            total: 42,
            items: [
              {
                chat_id: 1,
                question: 'q',
                answer: 'a',
                created_at: '2026-09-17T10:00:00+09:00',
              },
            ],
          },
        })
      }),
    )

    const result = await getMyChats({ limit: 10, offset: 20 })

    expect(url!.searchParams.get('limit')).toBe('10')
    expect(url!.searchParams.get('offset')).toBe('20')
    expect(result.total).toBe(42)
    expect(result.items).toHaveLength(1)
  })
})

describe('엔드포인트 공통 동작', () => {
  it('실패는 ApiError 로 전파된다', async () => {
    server.use(
      http.post(`${BASE}/api/auth/signup`, () =>
        HttpResponse.json({ code: 409, data: { message: '이미 가입된 이메일입니다.' } }),
      ),
    )

    const error = await signup({
      email: 'user@example.com',
      password: 'password1234',
      nickname: '테스터',
    }).catch((e: unknown) => e)

    expect(isApiError(error)).toBe(true)
    expect((error as ApiError).code).toBe(RESULT_CODE.conflict)
    expect((error as ApiError).message).toBe('이미 가입된 이메일입니다.')
  })

  it('signal 을 넘기면 요청을 취소할 수 있다', async () => {
    saveTokens('access-1', 'refresh-1')
    server.use(
      http.get(`${BASE}/api/me/chats`, async () => {
        await delay(50)
        return HttpResponse.json({ code: 200, data: { total: 0, items: [] } })
      }),
    )

    const controller = new AbortController()
    const promise = getMyChats({}, controller.signal)
    controller.abort()

    const error = await promise.catch((e: unknown) => e)

    expect(axios.isCancel(error)).toBe(true)
  })
})
