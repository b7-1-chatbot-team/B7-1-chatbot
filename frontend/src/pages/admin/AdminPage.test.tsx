import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { instance } from '@/api/instance'
import { ToastRegion } from '@/components/Toast'
import { ToastProvider } from '@/store/ToastProvider'
import { server } from '@/test/server'
import AdminPage from './AdminPage'

const BASE = 'https://api.test'

beforeAll(() => {
  instance.defaults.baseURL = BASE
})

const ok = (data: unknown) => HttpResponse.json({ code: 200, data })
const fail = (code: number, message: string) => HttpResponse.json({ code, data: { message } })

const STATS = {
  users: 12,
  chats: { total: 240, success: 228, failed: 12 },
  failures: { AI_TIMEOUT: 7, AI_CALL_FAILED: 5 },
  avg_latency_ms: 1320,
}

const user = (id: number, email = `user${id}@example.com`) => ({
  id,
  email,
  nickname: `사용자${id}`,
  role: id === 1 ? 'admin' : 'user',
  created_at: '2026-09-14T10:00:00+09:00',
  chat_count: id,
  last_chat_at: '2026-09-14T10:05:00+09:00',
})

const chat = (id: number, status: 'success' | 'error' = 'success') => ({
  chat_id: id,
  question: `<b>질문 ${id}</b>`,
  answer: status === 'success' ? `답변 ${id}` : null,
  status,
  error_code: status === 'error' ? 'AI_TIMEOUT' : null,
  latency_ms: status === 'error' ? 30000 : 1240,
  request_id: `req${id}`,
  created_at: '2026-09-14T10:05:00+09:00',
})

let userRequests: string[]

/** 기본 응답. 각 테스트는 필요한 것만 server.use 로 덮어쓴다 */
beforeEach(() => {
  userRequests = []
  server.use(
    http.get(`${BASE}/api/admin/stats`, () => ok(STATS)),
    http.get(`${BASE}/api/admin/users`, ({ request }) => {
      const url = new URL(request.url)
      userRequests.push(url.search)
      const q = url.searchParams.get('q') ?? ''
      const all = [user(3, 'kim@example.com'), user(2, 'lee@test.com'), user(1, 'admin@example.com')]
      const matched = all.filter((u) => u.email.includes(q))
      return ok({ total: matched.length, items: matched })
    }),
    http.get(`${BASE}/api/admin/users/:id/chats`, ({ params }) => {
      if (params.id === '99') return fail(404, '사용자를 찾을 수 없습니다.')
      return ok({
        user: {
          id: Number(params.id),
          email: 'kim@example.com',
          nickname: '김',
        },
        total: 2,
        items: [chat(988, 'error'), chat(987)],
      })
    }),
    http.get(`${BASE}/api/admin/failures`, () =>
      ok({
        total: 1,
        items: [
          {
            chat_id: 988,
            user_id: 3,
            email: 'kim@example.com',
            question: '긴 글 요약해줘',
            error_code: 'AI_CALL_FAILED',
            latency_ms: 800,
            request_id: 'req988',
            created_at: '2026-09-14T10:06:00+09:00',
          },
        ],
      }),
    ),
    http.get(`${BASE}/api/admin/requests/:id/logs`, ({ params }) => {
      if (params.id !== 'req988') return fail(404, '해당 요청의 로그가 없습니다.')
      return ok({
        request_id: 'req988',
        items: [
          {
            event: 'request_received',
            level: 'INFO',
            user_id: 3,
            detail: 'path=/api/chat',
            created_at: '2026-09-14T10:05:30+09:00',
          },
          {
            event: 'ai_call_failed',
            level: 'ERROR',
            user_id: 3,
            detail: 'reason=timeout latency_ms=30000',
            created_at: '2026-09-14T10:06:00+09:00',
          },
        ],
      })
    }),
  )
})

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="현재 쿼리">{location.search}</output>
}

function renderAdmin(search = '') {
  render(
    <MemoryRouter initialEntries={[`/console${search}`]}>
      <ToastProvider>
        <AdminPage />
        <ToastRegion />
      </ToastProvider>
      <LocationProbe />
    </MemoryRouter>,
  )
}

const query = () => screen.getByLabelText('현재 쿼리').textContent
/** 사용자 목록의 이메일 — 버튼 안 첫 칸(email). 관리자는 뒤에 " (관리자)" 를 붙여 비교한다 */
const userButtons = () =>
  within(screen.getByRole('list', { name: '사용자' }))
    .getAllByRole('button')
    .map((b) => {
      const [email, badge] = b.querySelectorAll('span')
      return badge?.textContent ? `${email.textContent} (${badge.textContent})` : email.textContent
    })

describe('관리자 — 요약 통계', () => {
  it('6칸을 보여준다', async () => {
    renderAdmin()
    const stats = screen.getByLabelText('요약 통계')
    await waitFor(() => expect(within(stats).getByText('228')).toBeInTheDocument())
    // 항목 이름과 값을 짝지어 확인한다
    const pairs = Object.fromEntries(
      within(stats)
        .getAllByRole('term')
        .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
    )
    expect(pairs).toEqual({
      사용자: '12',
      '대화 성공': '228',
      '대화 실패': '12',
      AI_TIMEOUT: '7',
      AI_CALL_FAILED: '5',
      '평균 응답': '1,320ms',
    })
  })

  it('403 이면 서버 문구를 그대로 보여준다', async () => {
    server.use(http.get(`${BASE}/api/admin/stats`, () => fail(403, '관리자만 접근할 수 있습니다.')))
    renderAdmin()
    expect(await screen.findByText(/관리자만 접근할 수 있습니다/)).toBeInTheDocument()
  })

  it('[새로고침] 은 통계와 목록을 다시 불러온다', async () => {
    let statsCalls = 0
    server.use(http.get(`${BASE}/api/admin/stats`, () => (statsCalls++, ok(STATS))))
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    await userEvent.click(screen.getByRole('button', { name: '새로고침' }))
    await waitFor(() => expect(statsCalls).toBe(2))
    await waitFor(() => expect(userRequests).toHaveLength(2))
  })
})

describe('관리자 — 사용자 목록', () => {
  it('사용자와 대화 수를 보여주고 관리자를 표시한다', async () => {
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    expect(userButtons()).toEqual(['kim@example.com', 'lee@test.com', 'admin@example.com (관리자)'])
  })

  it('검색은 입력이 멈춘 뒤 한 번만 요청한다', async () => {
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    await userEvent.type(screen.getByRole('searchbox', { name: '이메일 검색' }), 'example')

    await waitFor(() => expect(userButtons()).toEqual(['kim@example.com', 'admin@example.com (관리자)']))
    // 첫 목록 1번 + 검색 1번. 글자마다 요청하지 않는다
    expect(userRequests).toHaveLength(2)
    expect(userRequests[1]).toContain('q=example')
  })

  it('[목록 새로고침] 은 검색어를 유지한 채 사용자 목록만 다시 불러온다', async () => {
    let statsCalls = 0
    server.use(http.get(`${BASE}/api/admin/stats`, () => (statsCalls++, ok(STATS))))
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    await userEvent.type(screen.getByRole('searchbox', { name: '이메일 검색' }), 'kim')
    await waitFor(() => expect(userButtons()).toEqual(['kim@example.com']))

    await userEvent.click(screen.getByRole('button', { name: '목록 새로고침' }))
    await waitFor(() => expect(userRequests).toHaveLength(3))
    expect(userRequests[2]).toContain('q=kim')
    await screen.findByRole('list', { name: '사용자' })
    expect(statsCalls).toBe(1)
  })

  it('검색 결과가 없으면 안내한다', async () => {
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    await userEvent.type(screen.getByRole('searchbox', { name: '이메일 검색' }), 'zzz')
    expect(await screen.findByText('"zzz" 에 해당하는 사용자가 없습니다.')).toBeInTheDocument()
  })

  it('[더 보기] 가 실패하면 토스트로 알리고 받은 목록은 그대로 둔다', async () => {
    server.use(
      http.get(`${BASE}/api/admin/users`, ({ request }) => {
        const offset = Number(new URL(request.url).searchParams.get('offset'))
        if (offset > 0) return HttpResponse.error()
        return ok({ total: 25, items: Array.from({ length: 20 }, (_, i) => user(100 - i)) })
      }),
    )
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    await userEvent.click(screen.getByRole('button', { name: '더 보기' }))

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent('더 불러오지 못했습니다.')
    expect(within(toast).getByRole('button', { name: '다시 불러오기' })).toBeInTheDocument()
    expect(userButtons()).toHaveLength(20)
  })

  it('대화가 없는 사용자는 "대화 없음"', async () => {
    server.use(http.get(`${BASE}/api/admin/users`, () => ok({ total: 1, items: [{ ...user(9), chat_count: 0, last_chat_at: null }] })))
    renderAdmin()
    expect(await screen.findByText('0건 · 대화 없음')).toBeInTheDocument()
  })

  it('[더 보기] 는 받은 개수만큼 offset 을 올리고 다 받으면 사라진다 (PC 는 10명씩)', async () => {
    const pages: string[] = []
    server.use(
      http.get(`${BASE}/api/admin/users`, ({ request }) => {
        const params = new URL(request.url).searchParams
        const offset = Number(params.get('offset'))
        const limit = Number(params.get('limit'))
        pages.push(`${limit}:${offset}`)
        const all = Array.from({ length: 15 }, (_, i) => user(100 - i))
        return ok({ total: 15, items: all.slice(offset, offset + limit) })
      }),
    )
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    expect(userButtons()).toHaveLength(10)

    await userEvent.click(screen.getByRole('button', { name: '더 보기' }))
    await waitFor(() => expect(userButtons()).toHaveLength(15))
    expect(pages).toEqual(['10:0', '10:10'])
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()
  })
})

describe('관리자 — 태블릿·모바일 사용자 목록', () => {
  // 목록과 대화가 위아래로 쌓이는 폭(≤900px)으로 만든다
  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(max-width: 900px)',
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    )
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('한 번에 5명씩 불러온다', async () => {
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    expect(userRequests[0]).toContain('limit=5')
  })

  it('[목록 접기] 로 목록을 숨기고 [목록 펼치기] 로 그대로 다시 보여준다', async () => {
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })

    const toggle = screen.getByRole('button', { name: '목록 접기' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(toggle)

    expect(screen.getByRole('button', { name: '목록 펼치기' })).toHaveAttribute('aria-expanded', 'false')
    // 접어도 받은 목록은 지우지 않는다 — 다시 요청하지 않는다
    await userEvent.click(screen.getByRole('button', { name: '목록 펼치기' }))
    expect(userButtons()).toHaveLength(3)
    expect(userRequests).toHaveLength(1)
  })

  it('사용자를 고르면 목록을 접고 대화 제목으로 초점을 옮긴다', async () => {
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })

    await userEvent.click(screen.getByRole('button', { name: /kim@example.com/ }))

    expect(screen.getByRole('button', { name: '목록 펼치기' })).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(document.activeElement).toHaveAttribute('id', 'admin-user-chats-title'))
  })

  it('사용자를 고른 주소로 들어오면 목록이 접힌 채로 시작한다', async () => {
    renderAdmin('?user=3')
    expect(await screen.findByRole('button', { name: '목록 펼치기' })).toBeInTheDocument()
  })
})

describe('관리자 — 사용자별 대화', () => {
  it('사용자를 고르면 대화를 보여주고 URL 에 남긴다', async () => {
    renderAdmin()
    await screen.findByRole('list', { name: '사용자' })
    await userEvent.click(screen.getByRole('button', { name: /^kim@example.com/ }))

    expect(
      await screen.findByRole('heading', {
        name: 'kim@example.com 의 대화 (2)',
      }),
    ).toBeInTheDocument()
    expect(query()).toBe('?user=3')
    expect(screen.getByRole('button', { name: /^kim@example.com/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('성공·실패 배지와 응답시간을 보여주고, 실패에는 답변이 없다', async () => {
    renderAdmin('?user=3')
    const failed = await screen.findByRole('article', { name: '대화 #988' })
    expect(failed).toHaveTextContent('ERROR 504 · AI_TIMEOUT')
    expect(failed).toHaveTextContent('30,000ms')
    expect(within(failed).queryByText('답변')).not.toBeInTheDocument()

    const success = screen.getByRole('article', { name: '대화 #987' })
    expect(success).toHaveTextContent('SUCCESS')
    expect(success).toHaveTextContent('답변 987')
  })

  it('질문 원문을 HTML 로 해석하지 않는다', async () => {
    renderAdmin('?user=3')
    const record = await screen.findByRole('article', { name: '대화 #987' })
    expect(record).toHaveTextContent('<b>질문 987</b>')
    expect(record.querySelector('b')).toBeNull()
  })

  it('주소의 ?user= 로 들어오면 바로 그 사용자를 보여준다 (새로고침·공유)', async () => {
    renderAdmin('?user=3')
    expect(
      await screen.findByRole('heading', {
        name: 'kim@example.com 의 대화 (2)',
      }),
    ).toBeInTheDocument()
  })

  it('없는 사용자는 서버 문구로 안내한다', async () => {
    renderAdmin('?user=99')
    expect(await screen.findByText(/사용자를 찾을 수 없습니다/)).toBeInTheDocument()
  })
})

describe('관리자 — AI 실패 기록과 요청 흐름', () => {
  it('탭을 바꾸면 실패 기록을 보여준다', async () => {
    renderAdmin()
    await userEvent.click(screen.getByRole('tab', { name: 'AI 실패 기록' }))

    const failure = await screen.findByRole('article', { name: '실패 #988' })
    expect(failure).toHaveTextContent('kim@example.com')
    expect(failure).toHaveTextContent('502 · AI_CALL_FAILED')
    expect(query()).toBe('?tab=failures')
  })

  it('request_id 를 누르면 요청 흐름을 시간순으로 보여준다', async () => {
    renderAdmin('?tab=failures')
    await userEvent.click(await screen.findByRole('button', { name: '요청 흐름 보기 req988' }))

    const flow = await screen.findByRole('list', { name: '요청 흐름' })
    const events = within(flow).getAllByRole('listitem')
    expect(events[0]).toHaveTextContent('request_received')
    expect(events[1]).toHaveTextContent('ERROR')
    expect(events[1]).toHaveTextContent('ai_call_failed')
    expect(query()).toBe('?tab=failures&request=req988')
  })

  it('로그가 없는 요청은 "로그가 없습니다"', async () => {
    renderAdmin('?request=unknown')
    expect(await screen.findByText('로그가 없습니다.')).toBeInTheDocument()
  })

  it('보는 도중 새 실패가 생겨 목록이 밀려도 [더 보기] 에 중복이 없다', async () => {
    let ids = Array.from({ length: 25 }, (_, i) => 100 - i)
    server.use(
      http.get(`${BASE}/api/admin/failures`, ({ request }) => {
        const offset = Number(new URL(request.url).searchParams.get('offset'))
        const items = ids.slice(offset, offset + 20).map((id) => ({
          chat_id: id,
          user_id: 3,
          email: 'kim@example.com',
          question: `질문 ${id}`,
          error_code: 'AI_TIMEOUT',
          latency_ms: 30000,
          request_id: `req${id}`,
          created_at: '2026-09-14T10:06:00+09:00',
        }))
        return ok({ total: ids.length, items })
      }),
    )
    renderAdmin('?tab=failures')
    const list = await screen.findByRole('list', { name: 'AI 실패' })
    expect(within(list).getAllByRole('article')).toHaveLength(20)

    ids = [101, ...ids] // 새 실패가 맨 앞에 생겨 모두 한 칸 밀린다
    await userEvent.click(screen.getByRole('button', { name: '더 보기' }))

    await waitFor(() => expect(within(list).getAllByRole('article')).toHaveLength(25))
    const names = within(list).getAllByRole('article').map((a) => a.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(25)
  })

  it('[닫기] 와 탭 전환은 요청 흐름을 닫는다', async () => {
    renderAdmin('?tab=failures&request=req988')
    await screen.findByRole('list', { name: '요청 흐름' })
    await userEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('list', { name: '요청 흐름' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '요청 흐름 보기 req988' }))
    await screen.findByRole('list', { name: '요청 흐름' })
    await userEvent.click(screen.getByRole('tab', { name: '사용자' }))
    expect(screen.queryByRole('list', { name: '요청 흐름' })).not.toBeInTheDocument()
  })
})

describe('관리자 — 탭 접근성 (ARIA 탭 패턴)', () => {
  it('탭과 패널이 서로 연결되고, 선택된 탭만 Tab 순서에 있다', () => {
    renderAdmin()
    const users = screen.getByRole('tab', { name: '사용자' })
    const failures = screen.getByRole('tab', { name: 'AI 실패 기록' })

    const panel = screen.getByRole('tabpanel', { name: '사용자' })
    expect(users).toHaveAttribute('aria-controls', panel.id)
    expect(users).toHaveAttribute('tabindex', '0')
    expect(failures).toHaveAttribute('tabindex', '-1')
  })

  it('방향키로 다음 탭을 고르고 초점도 옮긴다 — 끝에서는 처음으로', async () => {
    renderAdmin()
    screen.getByRole('tab', { name: '사용자' }).focus()

    await userEvent.keyboard('{ArrowRight}')
    const failures = screen.getByRole('tab', { name: 'AI 실패 기록' })
    expect(failures).toHaveFocus()
    expect(failures).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'AI 실패 기록' })).toBeInTheDocument()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: '사용자' })).toHaveFocus()

    await userEvent.keyboard('{End}')
    expect(failures).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: '사용자' })).toHaveFocus()
  })
})

