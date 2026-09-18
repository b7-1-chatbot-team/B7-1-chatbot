import { render, screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { instance } from '@/api/instance'
import { AuthProvider } from '@/store/AuthProvider'
import { server } from '@/test/server'
import { saveTokens } from '@/utils/tokenStorage'
import AppRoutes from './index'

const BASE = 'https://api.test'

beforeAll(() => {
  instance.defaults.baseURL = BASE
})

const USER = { id: 1, email: 'user@example.com', nickname: '테스터', role: 'user' }
const ADMIN = { id: 2, email: 'admin@example.com', nickname: '관리자', role: 'admin' }

function mockMe(data: unknown, options: { delayMs?: number } = {}) {
  server.use(
    http.get(`${BASE}/api/auth/me`, async () => {
      if (options.delayMs) await delay(options.delayMs)
      return HttpResponse.json({ code: 200, data })
    }),
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * 화면은 제목으로 판별한다.
 * 본문 텍스트로 찾으면 같은 낱말이 버튼·링크에도 있어 조회가 모호해진다
 * (예: 로그인 화면의 "로그인" 은 제목이자 제출 버튼이다).
 */
const heading = (name: string) => screen.getByRole('heading', { name })
const queryHeading = (name: string) => screen.queryByRole('heading', { name })
const findHeading = (name: string) => screen.findByRole('heading', { name })

describe('RequireAuth — 로그인 필수 경로', () => {
  it('비로그인은 로그인 화면으로 가고 보호 화면은 렌더되지 않는다', () => {
    renderAt('/chat')

    expect(heading('로그인')).toBeTruthy()
    // 잠깐이라도 보였다가 튕기면 안 된다
    expect(queryHeading('챗')).toBeNull()
  })

  it('비로그인은 내 대화 로그도 접근할 수 없다', () => {
    renderAt('/logs')

    expect(heading('로그인')).toBeTruthy()
    expect(queryHeading('내 대화 로그')).toBeNull()
  })

  it('로그인 사용자는 통과한다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe(USER)

    renderAt('/chat')

    expect(await findHeading('챗')).toBeTruthy()
  })

  it('확인 중에는 아무 화면도 렌더하지 않는다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe(USER, { delayMs: 30 })

    renderAt('/chat')

    // 응답 전에 로그인으로 보내면 새로고침마다 로그인 화면이 번쩍인다
    expect(queryHeading('로그인')).toBeNull()
    expect(queryHeading('챗')).toBeNull()

    expect(await findHeading('챗')).toBeTruthy()
  })
})

describe('RequireAdmin — 관리자 전용 경로', () => {
  it('관리자는 통과한다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe(ADMIN)

    renderAt('/admin')

    expect(await findHeading('관리자')).toBeTruthy()
  })

  it('일반 사용자는 챗으로 보낸다 (로그인 화면이 아니다)', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe(USER)

    renderAt('/admin')

    expect(await findHeading('챗')).toBeTruthy()
    expect(queryHeading('관리자')).toBeNull()
  })

  it('비로그인은 로그인 화면으로 보낸다', () => {
    renderAt('/admin')

    expect(heading('로그인')).toBeTruthy()
    expect(queryHeading('관리자')).toBeNull()
  })
})

describe('GuestOnly — 게스트 전용 경로', () => {
  it('비로그인은 로그인 화면을 본다', () => {
    renderAt('/login')

    expect(heading('로그인')).toBeTruthy()
  })

  it('비로그인은 회원가입 화면을 본다', () => {
    renderAt('/signup')

    expect(heading('회원가입')).toBeTruthy()
  })

  it('로그인 상태로 로그인 화면에 오면 챗으로 보낸다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe(USER)

    renderAt('/login')

    expect(await findHeading('챗')).toBeTruthy()
  })
})

describe('미정의 경로', () => {
  it('비로그인은 로그인 화면으로 간다', () => {
    renderAt('/nowhere')

    expect(heading('로그인')).toBeTruthy()
  })

  it('로그인 상태면 로그인을 거쳐 결국 챗에 도착한다', async () => {
    saveTokens('access-1', 'refresh-1')
    mockMe(USER)

    renderAt('/nowhere')

    expect(await findHeading('챗')).toBeTruthy()
  })
})
