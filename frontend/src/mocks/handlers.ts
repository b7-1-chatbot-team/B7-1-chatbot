import { delay, http, HttpResponse } from 'msw'

/**
 * 개발용 가짜 백엔드 (docs/03-api.md 기준).
 *
 * 고정 응답이 아니라 **메모리 안에 상태를 둔다.** 방금 가입한 계정으로 실제 로그인이
 * 되어야 가입 → 로그인 → 보호 화면 진입 흐름을 눌러볼 수 있다.
 *
 * 응답 형식은 docs/03-api.md 를 그대로 따른다. 여기서 형식이 어긋나면
 * 모킹으로는 통과하고 실제 백엔드에서 깨진다.
 *
 * 테스트(vitest)는 각 테스트가 직접 핸들러를 등록하므로 이 파일을 쓰지 않는다.
 * 이 파일은 브라우저 개발용이다.
 */

/** access token 수명. 짧게 두어 재발급과 single-flight 를 눈으로 확인할 수 있게 한다 */
const ACCESS_TTL_MS = 30_000
const REFRESH_TTL_MS = 24 * 60 * 60 * 1000

interface MockUser {
  id: number
  email: string
  password: string
  nickname: string
  role: 'user' | 'admin'
  createdAt: string
}

const users: MockUser[] = []
/** access token → 만료 시각·사용자 */
const accessTokens = new Map<string, { userId: number; expiresAt: number }>()
/** refresh token → 만료 시각·사용자. 재발급 때 이전 토큰을 지워 회전을 재현한다 */
const refreshTokens = new Map<string, { userId: number; expiresAt: number }>()

let nextId = 1
let tokenSeq = 0

function fail(code: number, message: string) {
  // 서버는 실패도 HTTP 200 으로 답한다 (docs/03-api.md §0)
  return HttpResponse.json({ code, data: { message } })
}

function issueTokens(userId: number) {
  tokenSeq += 1
  const accessToken = `mock-access-${tokenSeq}`
  const refreshToken = `mock-refresh-${tokenSeq}`
  const now = Date.now()

  accessTokens.set(accessToken, { userId, expiresAt: now + ACCESS_TTL_MS })
  refreshTokens.set(refreshToken, { userId, expiresAt: now + REFRESH_TTL_MS })

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

  const entry = accessTokens.get(header.slice('Bearer '.length))
  if (!entry) return null
  if (entry.expiresAt < Date.now()) return null

  return users.find((user) => user.id === entry.userId) ?? null
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
  // 회원가입 (docs/03-api.md §1-1)
  http.post('*/api/auth/signup', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; nickname: string }

    const forced = await forcedScenario(body.email)
    if (forced) return forced

    // 이메일은 대소문자를 구분하지 않는다
    const exists = users.some((user) => user.email.toLowerCase() === body.email.toLowerCase())
    if (exists) return fail(409, '이미 가입된 이메일입니다.')

    if (body.password.length < 8) return fail(422, '비밀번호는 8자 이상으로 입력해 주세요.')

    const user: MockUser = {
      id: nextId++,
      email: body.email,
      password: body.password,
      nickname: body.nickname,
      // 첫 계정은 관리자로 만든다. 관리자 화면을 확인하려면 가장 먼저 가입한다
      role: users.length === 0 ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    }
    users.push(user)

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

  // 로그인 (docs/03-api.md §1-2)
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    const forced = await forcedScenario(body.email)
    if (forced) return forced

    const user = users.find((candidate) => candidate.email.toLowerCase() === body.email.toLowerCase())
    // 계정이 없을 때와 비밀번호가 틀렸을 때를 구분해 알려주지 않는다
    if (!user || user.password !== body.password) {
      return fail(401, '이메일 또는 비밀번호가 올바르지 않습니다.')
    }

    return HttpResponse.json({ code: 200, data: issueTokens(user.id) })
  }),

  // 토큰 재발급 (docs/03-api.md §1-4)
  http.post('*/api/auth/refresh', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { refresh_token?: string } | null
    if (!body?.refresh_token) return fail(422, '요청 형식이 올바르지 않습니다.')

    const entry = refreshTokens.get(body.refresh_token)
    if (!entry || entry.expiresAt < Date.now()) return fail(401, '로그인이 필요합니다.')

    // 회전: 이전 토큰을 즉시 폐기한다. 이래야 single-flight 가 필요한 상황이 재현된다
    refreshTokens.delete(body.refresh_token)

    return HttpResponse.json({ code: 200, data: issueTokens(entry.userId) })
  }),

  // 로그아웃 (docs/03-api.md §1-5)
  http.post('*/api/auth/logout', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { refresh_token?: string } | null
    if (!body?.refresh_token) return fail(422, '요청 형식이 올바르지 않습니다.')

    // 이미 없는 토큰이어도 200 이다 (같은 요청을 여러 번 보내도 결과가 같다)
    refreshTokens.delete(body.refresh_token)
    return HttpResponse.json({ code: 200, data: {} })
  }),

  // 내 정보 (docs/03-api.md §1-3)
  http.get('*/api/auth/me', ({ request }) => {
    const user = authenticate(request)
    if (!user) return fail(401, '로그인이 필요합니다.')

    return HttpResponse.json({
      code: 200,
      data: { id: user.id, email: user.email, nickname: user.nickname, role: user.role },
    })
  }),
]
