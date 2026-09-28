import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import type { JsonBodyType } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'

import { instance } from '@/api/instance'
import { server } from '@/test/server'
import ChatPage from './ChatPage'

const BASE = 'https://api.test'

beforeAll(() => {
  instance.defaults.baseURL = BASE
})

const item = (id: number, q: string, a: string) => ({
  chat_id: id,
  question: q,
  answer: a,
  created_at: '2026-09-28T10:00:00+09:00',
})

function mockHistory(items: unknown[] = []) {
  server.use(
    http.get(`${BASE}/api/me/chats`, () =>
      HttpResponse.json({ code: 200, data: { total: items.length, items } }),
    ),
  )
}

function mockChat(respond: (message: string) => JsonBodyType) {
  const sent: string[] = []
  server.use(
    http.post(`${BASE}/api/chat`, async ({ request }) => {
      const { message } = (await request.json()) as { message: string }
      sent.push(message)
      await delay(20)
      return HttpResponse.json(respond(message))
    }),
  )
  return sent
}

const ok = (message: string) => ({
  code: 200,
  data: { chat_id: 99, question: message, answer: `답: ${message}`, created_at: '2026-09-28T10:05:00+09:00' },
})
const timeout = { code: 504, data: { message: '현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.' } }

function renderChat() {
  render(
    <MemoryRouter>
      <ChatPage />
    </MemoryRouter>,
  )
}

const bubbles = () => within(screen.getByRole('list', { name: '대화' })).queryAllByRole('listitem')
const kinds = () => bubbles().map((li) => li.dataset.kind)

async function ask(question: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('질문'), `${question}{Enter}`)
}

describe('챗 — 이전 대화 복원', () => {
  it('진입하면 이전 대화를 불러와 오래된 것부터 보여준다', async () => {
    // 서버는 최신순으로 준다
    mockHistory([item(2, '두 번째 질문', '두 번째 답'), item(1, '첫 질문', '첫 답')])
    renderChat()

    await waitFor(() => expect(bubbles()).toHaveLength(4))
    expect(bubbles().map((li) => li.querySelector('p')?.textContent)).toEqual([
      '첫 질문',
      '첫 답',
      '두 번째 질문',
      '두 번째 답',
    ])
  })

  it('이전 대화가 없으면 인사 문구를 보여준다', async () => {
    mockHistory([])
    renderChat()

    expect(await screen.findByText('안녕하세요. 무엇이든 물어보세요.')).toBeInTheDocument()
  })

  it('불러오지 못하면 안내하고 다시 불러올 수 있다', async () => {
    const user = userEvent.setup()
    server.use(http.get(`${BASE}/api/me/chats`, () => HttpResponse.json({ code: 500, data: { message: 'x' } })))
    renderChat()

    expect(await screen.findByText(/이전 대화를 불러오지 못했습니다/)).toBeInTheDocument()

    mockHistory([item(1, '복구된 질문', '복구된 답')])
    await user.click(screen.getByRole('button', { name: '다시 불러오기' }))

    await waitFor(() => expect(bubbles()).toHaveLength(2))
  })
})

describe('챗 — 전송', () => {
  it('질문을 즉시 보여주고, 응답 대기 뒤 답으로 바꾼다', async () => {
    mockHistory([])
    mockChat(ok)
    renderChat()
    await screen.findByText('안녕하세요. 무엇이든 물어보세요.')

    await ask('CORS 가 뭐야?')

    expect(kinds()).toEqual(['user', 'pending'])
    await waitFor(() => expect(kinds()).toEqual(['user', 'bot']))
    expect(screen.getByText('답: CORS 가 뭐야?')).toBeInTheDocument()
  })

  it('이전 대화 아래에 이어서 쌓인다', async () => {
    mockHistory([item(1, '예전 질문', '예전 답')])
    mockChat(ok)
    renderChat()
    await waitFor(() => expect(bubbles()).toHaveLength(2))

    await ask('새 질문')

    await waitFor(() => expect(kinds()).toEqual(['user', 'bot', 'user', 'bot']))
  })

  it('AI 답변을 HTML 로 해석하지 않는다 (XSS 방지)', async () => {
    mockHistory([])
    mockChat(() => ({
      code: 200,
      data: { chat_id: 1, question: 'q', answer: '<img src=x onerror=alert(1)>', created_at: '' },
    }))
    renderChat()
    await screen.findByText('안녕하세요. 무엇이든 물어보세요.')

    await ask('q')

    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('ol img')).toBeNull()
  })
})

describe('챗 — 오류와 다시 시도', () => {
  it('504 는 안내 문구·코드와 [다시 시도] 를 보여준다', async () => {
    mockHistory([])
    mockChat(() => timeout)
    renderChat()
    await screen.findByText('안녕하세요. 무엇이든 물어보세요.')

    await ask('느린 질문')

    const bubble = await screen.findByRole('alert')
    expect(bubble).toHaveTextContent('현재 응답이 지연되고 있어요')
    expect(bubble).toHaveTextContent('504 · AI_TIMEOUT')
    expect(within(bubble).getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('[다시 시도] 는 같은 질문을 다시 보내고 오류 자리를 결과로 바꾼다', async () => {
    const user = userEvent.setup()
    mockHistory([])
    let calls = 0
    const sent = mockChat((message) => (++calls === 1 ? timeout : ok(message)))
    renderChat()
    await screen.findByText('안녕하세요. 무엇이든 물어보세요.')
    await ask('다시 보낼 질문')
    const bubble = await screen.findByRole('alert')

    await user.click(within(bubble).getByRole('button', { name: '다시 시도' }))

    await waitFor(() => expect(kinds()).toEqual(['user', 'bot']))
    expect(sent).toEqual(['다시 보낼 질문', '다시 보낼 질문'])
  })

  it('500 은 다시 보내도 결과가 같아 [다시 시도] 가 없다', async () => {
    mockHistory([])
    mockChat(() => ({ code: 500, data: { message: '서버 내부 오류가 발생했습니다.' } }))
    renderChat()
    await screen.findByText('안녕하세요. 무엇이든 물어보세요.')

    await ask('질문')

    const bubble = await screen.findByRole('alert')
    expect(bubble).toHaveTextContent('500 · INTERNAL_ERROR')
    expect(within(bubble).queryByRole('button', { name: '다시 시도' })).toBeNull()
  })

  it('서버에 닿지 못하면 연결 실패를 안내한다', async () => {
    mockHistory([])
    server.use(http.post(`${BASE}/api/chat`, () => HttpResponse.error()))
    renderChat()
    await screen.findByText('안녕하세요. 무엇이든 물어보세요.')

    await ask('질문')

    const bubble = await screen.findByRole('alert')
    expect(bubble).toHaveTextContent('서버에 연결할 수 없습니다')
    expect(bubble).toHaveTextContent('NETWORK_ERROR')
  })

  it('오류 뒤 입력칸으로 포커스가 돌아온다', async () => {
    mockHistory([])
    mockChat(() => timeout)
    renderChat()
    await screen.findByText('안녕하세요. 무엇이든 물어보세요.')

    await ask('질문')
    await screen.findByRole('alert')

    await waitFor(() => expect(screen.getByLabelText('질문')).toHaveFocus())
  })
})
