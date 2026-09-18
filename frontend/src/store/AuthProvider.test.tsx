import { act, render, renderHook, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeAll, describe, expect, it } from 'vitest'

import { instance } from '@/api/instance'
import { useAccessToken } from '@/hooks/useAccessToken'
import { useAuth } from '@/hooks/useAuth'
import { server } from '@/test/server'
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/utils/tokenStorage'
import { AuthProvider } from './AuthProvider'

const BASE = 'https://api.test'

beforeAll(() => {
  instance.defaults.baseURL = BASE
})

const USER = { id: 1, email: 'user@example.com', nickname: '테스터', role: 'user' }
const ADMIN = { id: 2, email: 'admin@example.com', nickname: '관리자', role: 'admin' }

/** GET /api/auth/me 핸들러. 호출 횟수를 센다 */
function mockMe(data: unknown = USER, options: { fail?: boolean } = {}) {
  const calls = { count: 0 }
  server.use(
    http.get(`${BASE}/api/auth/me`, () => {
      calls.count += 1
      if (options.fail) {
        return HttpResponse.json({ code: 401, data: { message: '로그인이 필요합니다.' } })
      }
      return HttpResponse.json({ code: 200, data })
    }),
  )
  return calls
}

/** 현재 인증 상태를 화면에 드러내는 검사용 컴포넌트 */
function Probe() {
  const { status, user } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="nickname">{user?.nickname ?? '-'}</span>
      <span data-testid="role">{user?.role ?? '-'}</span>
    </div>
  )
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

describe('AuthProvider — 상태 전이', () => {
  it('토큰이 없으면 anonymous 이고 서버에 묻지 않는다', () => {
    const meCalls = mockMe()

    renderProbe()

    expect(screen.getByTestId('status').textContent).toBe('anonymous')
    expect(meCalls.count).toBe(0)
  })

  it('토큰이 있으면 checking 을 거쳐 authenticated 가 된다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe()

    renderProbe()

    expect(screen.getByTestId('status').textContent).toBe('checking')
    expect(await screen.findByText('authenticated')).toBeTruthy()
    expect(screen.getByTestId('nickname').textContent).toBe('테스터')
  })

  it('role 을 그대로 전달한다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe(ADMIN)

    renderProbe()

    expect(await screen.findByText('authenticated')).toBeTruthy()
    expect(screen.getByTestId('role').textContent).toBe('admin')
  })

  it('앱이 떠 있는 동안 /api/auth/me 를 한 번만 호출한다', async () => {
    saveTokens('access-1', 'refresh-1')
    const meCalls = mockMe()

    const { rerender } = renderProbe()
    expect(await screen.findByText('authenticated')).toBeTruthy()

    rerender(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(meCalls.count).toBe(1)
  })
})

describe('AuthProvider — 토큰 구독 연결', () => {
  it('인터셉터처럼 clearTokens() 만 호출해도 anonymous 로 바뀐다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe()

    renderProbe()
    expect(await screen.findByText('authenticated')).toBeTruthy()

    // 재발급이 최종 실패했을 때 인터셉터가 하는 일과 동일하다
    act(() => clearTokens())

    expect(screen.getByTestId('status').textContent).toBe('anonymous')
    expect(screen.getByTestId('nickname').textContent).toBe('-')
  })

  it('다른 탭에서 로그아웃하면(storage 이벤트) 이 탭도 anonymous 가 된다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe()

    renderProbe()
    expect(await screen.findByText('authenticated')).toBeTruthy()

    act(() => {
      localStorage.removeItem('auth:access_token')
      window.dispatchEvent(new StorageEvent('storage', { key: 'auth:access_token' }))
    })

    expect(screen.getByTestId('status').textContent).toBe('anonymous')
  })

  it('/api/auth/me 가 실패하면 토큰을 정리하고 anonymous 가 된다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe(null, { fail: true })
    // 재발급도 실패시켜 인터셉터가 로그인 상태를 되살리지 못하게 한다
    server.use(
      http.post(`${BASE}/api/auth/refresh`, () =>
        HttpResponse.json({ code: 401, data: { message: '로그인이 필요합니다.' } }),
      ),
    )

    renderProbe()

    expect(await screen.findByText('anonymous')).toBeTruthy()
    expect(getAccessToken()).toBeNull()
  })
})

describe('AuthProvider — login / logout', () => {
  it('login 은 토큰을 저장하고 이어서 사용자 정보를 불러온다', async () => {
    const meCalls = mockMe()
    server.use(
      http.post(`${BASE}/api/auth/login`, () =>
        HttpResponse.json({
          code: 200,
          data: {
            access_token: 'access-1',
            refresh_token: 'refresh-1',
            token_type: 'bearer',
            expires_in: 900,
            refresh_expires_in: 86_400,
          },
        }),
      ),
    )

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.status).toBe('anonymous')

    await act(() => result.current.login('user@example.com', 'password1234'))

    expect(getAccessToken()).toBe('access-1')
    expect(getRefreshToken()).toBe('refresh-1')
    expect(result.current.status).toBe('authenticated')
    expect(meCalls.count).toBe(1)
  })

  it('logout 은 refresh token 을 서버에 보내고 토큰을 지운다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe()
    let received: unknown = null
    server.use(
      http.post(`${BASE}/api/auth/logout`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ code: 200, data: {} })
      }),
    )

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    await act(async () => {
      await Promise.resolve()
    })

    await act(() => result.current.logout())

    expect(received).toEqual({ refresh_token: 'refresh-1' })
    expect(getAccessToken()).toBeNull()
    expect(result.current.status).toBe('anonymous')
  })

  it('로그아웃 요청이 실패해도 토큰을 지운다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe()
    server.use(http.post(`${BASE}/api/auth/logout`, () => HttpResponse.error()))

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

    await act(() => result.current.logout().catch(() => undefined))

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(result.current.status).toBe('anonymous')
  })
})

describe('useAuth', () => {
  it('Provider 밖에서 쓰면 오류를 던진다', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/)
  })
})

describe('useAccessToken', () => {
  it('토큰 변화를 구독해 최신 값을 돌려준다', () => {
    const { result } = renderHook(() => useAccessToken())

    expect(result.current).toBeNull()

    act(() => saveTokens('access-1', 'refresh-1'))
    expect(result.current).toBe('access-1')

    act(() => clearTokens())
    expect(result.current).toBeNull()
  })
})
