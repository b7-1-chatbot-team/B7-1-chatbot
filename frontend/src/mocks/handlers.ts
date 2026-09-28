import { delay, http, HttpResponse } from 'msw'

/**
 * 개발용 가짜 백엔드 (docs/03-api.md 기준).
 *
 * 응답 형식과 규칙은 실제 백엔드를 그대로 따른다. 여기서 어긋나면 모킹으로는 통과하고
 * 실제 백엔드에서 깨지므로, 프론트가 잘못된 가정 위에서 개발하게 된다.
 *
 * 상태는 localStorage 에 보관한다. 메모리에만 두면 주소를 직접 입력하거나 새로고침할 때마다
 * 가입한 계정이 사라져, 관리자와 일반 사용자를 동시에 둘 수 없다.
 *
 * 초기화하려면 개발자도구에서 localStorage 의 `mock:db` 키를 지운다.
 *
 * 테스트(vitest)는 각 테스트가 직접 핸들러를 등록하므로 이 파일을 쓰지 않는다.
 */

/** access token 수명. 짧게 두어 재발급과 single-flight 를 눈으로 확인할 수 있게 한다 */
const ACCESS_TTL_MS = 30_000
const REFRESH_TTL_MS = 24 * 60 * 60 * 1000

const DB_KEY = 'mock:db'

interface MockUser {
  id: number
  email: string
  password: string
  nickname: string
  role: 'user' | 'admin'
  createdAt: string
}

interface TokenEntry {
  userId: number
  expiresAt: number
}

interface MockChat {
  chatId: number
  userId: number
  question: string
  answer: string
  createdAt: string
}

interface MockDb {
  users: MockUser[]
  /** 성공한 대화만 쌓는다. 실패 기록은 내 대화 로그에 나오지 않는다 (docs/03-api.md 3-1절) */
  chats: MockChat[]
  accessTokens: Record<string, TokenEntry>
  refreshTokens: Record<string, TokenEntry>
  nextId: number
  tokenSeq: number
}

/**
 * 관리자 계정은 **미리 심는다.**
 * 실제 서버도 시작 시 .env 의 ADMIN_EMAIL/ADMIN_PASSWORD 로 만들며,
 * 회원가입으로는 관리자를 만들 수 없다 (docs/03-api.md 4-0절).
 */
const SEED_ADMIN: MockUser = {
  id: 1,
  email: 'admin@example.com',
  password: 'admin1234',
  nickname: '관리자',
  role: 'admin',
  createdAt: new Date().toISOString(),
}

function emptyDb(): MockDb {
  return {
    users: [SEED_ADMIN],
    chats: [],
    accessTokens: {},
    refreshTokens: {},
    nextId: 2,
    tokenSeq: 0,
  }
}

function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return emptyDb()
    // 챗 기능 이전에 저장된 데이터에는 chats 가 없다
    return { chats: [], ...(JSON.parse(raw) as Partial<MockDb>) } as MockDb
  } catch {
    // 저장소를 못 쓰거나 내용이 깨졌으면 새로 시작한다
    return emptyDb()
  }
}

function saveDb(next: MockDb): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(next))
  } catch {
    // 저장소를 못 써도 이번 세션 동안은 메모리 값으로 계속 동작한다
  }
}

let db = loadDb()

/** 실제 서버는 이메일을 소문자로 정규화해 저장한다 (백엔드 _check_email) */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function fail(code: number, message: string) {
  // 서버는 실패도 HTTP 200 으로 답한다 (docs/03-api.md 0절)
  return HttpResponse.json({ code, data: { message } })
}

function issueTokens(userId: number) {
  db.tokenSeq += 1
  const accessToken = `mock-access-${db.tokenSeq}`
  const refreshToken = `mock-refresh-${db.tokenSeq}`
  const now = Date.now()

  db.accessTokens[accessToken] = { userId, expiresAt: now + ACCESS_TTL_MS }
  db.refreshTokens[refreshToken] = { userId, expiresAt: now + REFRESH_TTL_MS }
  saveDb(db)

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer' as const,
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    refresh_expires_in: Math.floor(REFRESH_TTL_MS / 1000),
  }
}

/** Authorization 헤더에서 사용자를 찾는다. 없거나 만료면 null */
function authenticate(request: Request): MockUser | null {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null

  const entry = db.accessTokens[header.slice('Bearer '.length)]
  if (!entry || entry.expiresAt < Date.now()) return null

  return db.users.find((user) => user.id === entry.userId) ?? null
}

/**
 * 이메일 접두어로 오류 상황을 강제한다. 실제 백엔드로는 재현하기 번거로운 경우를 위한 것이다.
 * 사용법은 frontend/README.md 참고.
 */
async function forcedScenario(email: string) {
  if (email.startsWith('slow@')) await delay(2000)
  if (email.startsWith('error500@')) return fail(500, '서버 내부 오류가 발생했습니다.')
  if (email.startsWith('error422@')) return fail(422, '입력값을 다시 확인해 주세요.')
  if (email.startsWith('offline@')) return HttpResponse.error()
  return null
}

export const handlers = [
  // 회원가입 (docs/03-api.md 1-1절)
  http.post('*/api/auth/signup', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; nickname: string }
    const email = normalizeEmail(body.email)

    const forced = await forcedScenario(email)
    if (forced) return forced

    if (db.users.some((user) => user.email === email)) {
      return fail(409, '이미 가입된 이메일입니다.')
    }
    if (body.password.length < 8) return fail(422, '비밀번호는 8자 이상으로 입력해 주세요.')

    const user: MockUser = {
      id: db.nextId++,
      email,
      password: body.password,
      nickname: body.nickname.trim(),
      // 가입으로 만들어지는 계정은 항상 일반 사용자다. 관리자는 시드로만 존재한다
      role: 'user',
      createdAt: new Date().toISOString(),
    }
    db.users.push(user)
    saveDb(db)

    return HttpResponse.json({
      code: 201,
      data: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        created_at: user.createdAt,
      },
    })
  }),

  // 로그인 (docs/03-api.md 1-2절)
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    const email = normalizeEmail(body.email)

    const forced = await forcedScenario(email)
    if (forced) return forced

    const user = db.users.find((candidate) => candidate.email === email)
    // 계정이 없을 때와 비밀번호가 틀렸을 때를 구분해 알려주지 않는다
    if (!user || user.password !== body.password) {
      return fail(401, '이메일 또는 비밀번호가 올바르지 않습니다.')
    }

    return HttpResponse.json({ code: 200, data: issueTokens(user.id) })
  }),

  // 토큰 재발급 (docs/03-api.md 1-4절)
  http.post('*/api/auth/refresh', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { refresh_token?: string } | null
    if (!body?.refresh_token) return fail(422, '요청 형식이 올바르지 않습니다.')

    const entry = db.refreshTokens[body.refresh_token]
    if (!entry || entry.expiresAt < Date.now()) return fail(401, '로그인이 필요합니다.')

    // 회전: 이전 토큰을 즉시 폐기한다. 이래야 single-flight 가 필요한 상황이 재현된다
    delete db.refreshTokens[body.refresh_token]

    return HttpResponse.json({ code: 200, data: issueTokens(entry.userId) })
  }),

  // 로그아웃 (docs/03-api.md 1-5절)
  http.post('*/api/auth/logout', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { refresh_token?: string } | null
    if (!body?.refresh_token) return fail(422, '요청 형식이 올바르지 않습니다.')

    // 이미 없는 토큰이어도 200 이다 (같은 요청을 여러 번 보내도 결과가 같다)
    delete db.refreshTokens[body.refresh_token]
    saveDb(db)

    return HttpResponse.json({ code: 200, data: {} })
  }),

  // 내 정보 (docs/03-api.md 1-3절)
  http.get('*/api/auth/me', ({ request }) => {
    const user = authenticate(request)
    if (!user) return fail(401, '로그인이 필요합니다.')

    return HttpResponse.json({
      code: 200,
      data: { id: user.id, email: user.email, nickname: user.nickname, role: user.role },
    })
  }),

  // 질문 전송 (docs/03-api.md 2-1절)
  http.post('*/api/chat', async ({ request }) => {
    const user = authenticate(request)
    if (!user) return fail(401, '로그인이 필요합니다.')

    const body = (await request.json().catch(() => null)) as { message?: string } | null
    const question = body?.message?.trim() ?? ''
    if (!question || question.length > 1000) return fail(422, '질문은 1~1000자로 입력해 주세요.')

    // 질문에 표시어를 넣어 AI 실패를 강제한다. 실제 AI API 로는 재현하기 어렵다
    if (question.includes('#slow')) await delay(6000)
    else await delay(500) // AI 가 답하는 시간 흉내 — 응답 대기 표시를 볼 수 있게
    if (question.includes('#timeout')) {
      return fail(504, '현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.')
    }
    if (question.includes('#fail')) {
      return fail(502, 'AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
    if (question.includes('#500')) return fail(500, '서버 내부 오류가 발생했습니다.')

    const chat: MockChat = {
      chatId: db.chats.length + 1,
      userId: user.id,
      question,
      answer: `(모킹 응답) "${question}" 에 대한 답변입니다.\n실제 AI 는 백엔드 연결 후 응답합니다.`,
      createdAt: new Date().toISOString(),
    }
    db.chats.push(chat)
    saveDb(db)

    return HttpResponse.json({
      code: 200,
      data: {
        chat_id: chat.chatId,
        question: chat.question,
        answer: chat.answer,
        created_at: chat.createdAt,
      },
    })
  }),

  // 내 대화 로그 (docs/03-api.md 3-1절) — 최신순, 성공 기록만
  http.get('*/api/me/chats', ({ request }) => {
    const user = authenticate(request)
    if (!user) return fail(401, '로그인이 필요합니다.')

    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const mine = db.chats.filter((chat) => chat.userId === user.id).reverse()

    return HttpResponse.json({
      code: 200,
      data: {
        total: mine.length,
        items: mine.slice(offset, offset + limit).map((chat) => ({
          chat_id: chat.chatId,
          question: chat.question,
          answer: chat.answer,
          created_at: chat.createdAt,
        })),
      },
    })
  }),

  // 개발 편의: 모킹 데이터를 초기 상태로 되돌린다 (브라우저 주소창으로는 호출되지 않는다)
  http.post('*/__mock__/reset', () => {
    db = emptyDb()
    saveDb(db)
    return HttpResponse.json({ code: 200, data: {} })
  }),
]
