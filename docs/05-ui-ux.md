# 05. UI / UX 설계

> 담당: **이성준 (프론트엔드)** — [09-team.md](09-team.md) §3 (관리자 화면 담당은 [11-open-issues.md](11-open-issues.md) G7)
> 스택: React · **TypeScript(strict)** · Vite · React Router · axios · Context API · **CSS Modules**
> 디자인 기준 시안: `docs/design/AI Chat Service.html` (다크 톤 · 청록 포인트 · 기술 정보는 모노 폰트)

## 1. 디자인 시스템

### 폰트

| 용도 | 폰트 | 사용처 |
|------|------|--------|
| 본문 | **IBM Plex Sans KR** (400/500/600) | 제목, 버튼, 말풍선, 폼 |
| 보조/기술 정보 | **IBM Plex Mono** (400/500) | 시각, 결과 코드, 엔드포인트 표기, 글자수, request_id |

Google Fonts 로드 + `system-ui` 폴백.

### 색상 토큰

전역 `index.css` 의 `:root` 에 CSS 변수로 선언하고, 컴포넌트별 `*.module.css` 에서 `var(--color-surface)` 처럼 사용한다.
CSS Modules 는 Vite 가 기본 지원하므로 별도 설치가 없다. 클래스 이름은 파일 단위로 격리된다 (`import styles from './Chat.module.css'` → `className={styles.bubble}`).

```css
/* frontend/src/index.css */
:root {
  --color-bg:          #0e1113;   /* 페이지 배경 */
  --color-surface:     #14181a;   /* 카드·패널 */
  --color-surface-2:   #161a1d;
  --color-bubble:      #1b2023;   /* 봇 말풍선 */
  --color-input:       #0f1315;   /* 입력 필드 */
  --color-border:      #22282b;
  --color-border-2:    #262c30;
  --color-text:        #e3e7e6;
  --color-muted:       #8b9599;
  --color-faint:       #5d666a;
  --color-accent:      oklch(0.72 0.07 186);   /* 주 버튼·링크 (청록) */
  --color-user-bubble: oklch(0.42 0.045 186);  /* 사용자 말풍선 */
  --color-warn:        oklch(0.72 0.09 55);    /* 오류 (빨강 대신 차분한 주황) */
}
```

### 형태

- 모서리: 카드 14px · 입력/버튼 9~10px · 말풍선 14px(꼬리 쪽 4px)
- 등장 애니메이션 `rise`(6px 위로 페이드) 0.25~0.3s, 로딩 점 `blink` 1.2s — `@media (prefers-reduced-motion: reduce)` 에서 비활성
- 최대 폭 1180px, 좌우 여백 `clamp(16px, 4vw, 32px)`

## 2. 라우팅

| 경로 | 화면 | 접근 |
|------|------|------|
| `/login` | 로그인 | 게스트 전용 (로그인 상태면 `/chat` 으로) |
| `/signup` | 회원가입 | 게스트 전용 |
| `/chat` | 챗 | **로그인 필수** |
| `/logs` | 내 대화 로그 | **로그인 필수** |
| `/admin` | 관리자 | **관리자 필수** (`role=admin`, 아니면 `/chat` 으로) |
| `*` | `/chat` 또는 `/login` 으로 리다이렉트 | |

라우팅 가드는 `AuthContext` 가 계산한 **`AuthStatus` 한 값**으로 판정한다. 토큰 유무와 사용자 정보 유무를 가드가 각각 검사하지 않는다.

| `AuthStatus` | 조건 | 가드 동작 |
|--------------|------|-----------|
| `anonymous` | localStorage 에 access token 이 없음 | **즉시** 로그인으로 이동 (서버에 묻지 않음) |
| `checking` | 토큰은 있고 `GET /api/auth/me` 응답 대기 중 | **판정 보류** (화면을 가리지 않고 아무것도 렌더하지 않음) |
| `authenticated` | 토큰이 있고 사용자 정보를 받아옴 | 통과. `RequireAdmin` 은 여기에 `role === 'admin'` 을 더한다 |

- `anonymous` 를 **토큰 유무로 동기 판정**하는 이유: 토큰이 없는데도 화면을 먼저 그리면, 첫 API 호출이 401 로 실패한 뒤에야 로그인으로 튕겨 **화면이 깜빡인다.**
- `checking` 에서 판정을 미루는 이유: `user` 초기값이 `null` 이라 응답 전에 판정하면 **새로고침할 때마다 로그인 화면이 한 번 번쩍인다.**
- 이 상태는 앱이 전체 로드될 때(새로고침·주소 직접 입력·탭 재실행) 한 번만 거치며, SPA 내부 화면 이동에서는 다시 발생하지 않는다.

프론트 가드는 화면 이동용이며, **권한 검사는 서버 `require_admin` 이 최종**이다. 사용자가 `AuthContext` 값을 직접 조작해도 관리자 메뉴만 보일 뿐 관리자 API 는 서버가 403 으로 막는다.

## 3. 화면 구성

### 공통 헤더 / 푸터

```
┌──────────────────────────────────────────────────────────────────────┐
│ [C] Chatlog (FastAPI · SQLite)  [챗|내 대화 로그|관리자]  <닉네임> [로그아웃] │  ← 관리자
│ [C] Chatlog (FastAPI · SQLite)  [챗|내 대화 로그]         <닉네임> [로그아웃] │  ← 로그인
│ [C] Chatlog (FastAPI · SQLite)                        [로그인] [회원가입]  │  ← 비로그인
└──────────────────────────────────────────────────────────────────────┘
```

- 헤더 sticky + blur. **인증 상태·권한에 따라 메뉴가 다르게 표시** (평가 항목 "로그인/비로그인에 따라 보이는 메뉴 구분")
- 사용자 표시는 **닉네임** (이메일은 노출하지 않음)
- 로그아웃: `POST /api/auth/logout` `{refresh_token}` → **응답과 관계없이** 저장된 access·refresh token 삭제 → `AuthContext` 초기화 → `/login` (네트워크 오류여도 로그아웃 처리)

### 화면 1: 회원가입 (`/signup`)

```
        회원가입
        ┌──────────────────────────────────┐
        │ 이메일     [user@example.com   ] │
        │ 비밀번호   [••••••••           ] │  8자 이상
        │ 닉네임     [어썸체크            ] │  1~20자 (중복 가능)
        │ [409] 이미 가입된 이메일입니다.  (주황) │
        │ [            가입하기           ] │
        │      이미 계정이 있나요? 로그인      │
        └──────────────────────────────────┘
        POST /api/auth/signup · 비밀번호는 bcrypt 로 해싱되어 저장됩니다
```

| 상호작용 | 동작 |
|----------|------|
| 클라이언트 검증 | 이메일 형식 / 비밀번호 8자 이상 / 닉네임 1~20자 → 실패 시 요청을 보내지 않음 |
| `code: 409` | `data.message` 표시 + 이메일 필드 포커스 |
| `code: 422` | `data.message` 그대로 표시 |
| `code: 201` | `/login` 이동 + "가입이 완료되었습니다" 안내 + **이메일 자동 입력** |
| 제출 중 | 버튼 "처리 중…" + disabled (중복 제출 방지) |

### 화면 2: 로그인 (`/login`)

```
        로그인
        챗봇 질문·응답 기능은 로그인한 사용자만 사용할 수 있습니다.
        ┌──────────────────────────────────┐
        │ (가입 완료 안내 — 청록 박스)          │
        │ 이메일     [user@example.com   ] │
        │ 비밀번호   [••••••••           ] │
        │ [401] 이메일 또는 비밀번호가 …  (주황) │
        │ [             로그인            ] │
        │      아직 계정이 없나요? 회원가입      │
        └──────────────────────────────────┘
        POST /api/auth/login · JWT 발급
```

| 상호작용 | 동작 |
|----------|------|
| `code: 200` | `access_token`·`refresh_token` 저장 → `GET /api/auth/me` → `AuthContext` 갱신 → 원래 가려던 경로(`state.from`) 또는 `/chat` |
| `code: 401` | 결과 코드 칩 + `data.message`, **비밀번호 필드만 비움**. 로그인 API 의 401 은 전역 로그아웃 처리하지 않음 |
| 접근성 | `label` 연결, `autocomplete=email / current-password / new-password`, 오류 `role="alert"` |

**토큰 저장 위치 — `localStorage` 확정** (access·refresh 모두 같은 곳, refresh 는 요청 body 로 전송).
"새로고침 시 로그인 상태 복원" 요구가 있어 메모리(Context) 저장으로는 충족할 수 없기 때문이다. 근거·대안 비교는 [12-decisions.md](12-decisions.md) §4.

| 키 | 값 |
|----|----|
| `auth:access_token` | access token (JWT, 15분) |
| `auth:refresh_token` | refresh token (1일, 재발급 시 회전) |

키 접두어는 **관심사(`auth:`)** 로 나눈다. `localStorage` 는 이미 도메인 단위로 격리되므로 서비스명을 접두어로 붙이지 않는다. 이후 키가 늘어나면 `ui:` 등으로 같은 규칙을 따른다.

토큰 읽기·쓰기·삭제는 `src/utils/tokenStorage.ts` 한 곳에서만 한다. 이 모듈은 **토큰이 바뀌면 구독자에게 알리고**, React 쪽은 `useSyncExternalStore` 기반 `useAccessToken` 훅으로 그 변화를 받는다. 덕분에 인터셉터가 재발급 실패로 토큰을 지우면 **`clearTokens()` 호출만으로** 화면이 로그인 상태에서 빠져나온다 (인터셉터는 `AuthContext` 를 알지 못한다).

**XSS 대응 — 저장 방식이 아니라 아래 두 축으로 막는다.** (해시·암호화 저장은 방어가 되지 않는다: 해시는 되돌릴 수 없어 서버에 보낼 수 없고, 암호화는 복호화 키도 브라우저에 있어야 하며, 스크립트를 실행할 수 있는 공격자는 저장된 토큰 없이도 로그인된 상태로 요청을 보낼 수 있다.)

| 축 | 조치 |
|----|------|
| XSS 를 만들지 않기 | `dangerouslySetInnerHTML` 사용 금지 — **AI 답변도 텍스트로만 렌더링** · 외부 스크립트(CDN·분석 태그) 미삽입 · 의존성 최소화 · 사용자 입력을 `href`/`src` 에 그대로 넣지 않기 |
| 터졌을 때 피해 줄이기 | access **15분** · refresh **회전**(재발급 시 이전 토큰 무효 → 탈취된 토큰의 수명이 "다음 재발급까지"로 줄고, 공격자와 사용자 중 한쪽이 튕겨 **탈취가 드러남**) · 로그아웃 시 서버에서 refresh 폐기 — 회전 이유 상세: [12-decisions.md](12-decisions.md) §9 |

> refresh token 을 HttpOnly 쿠키로 옮기면 XSS 노출은 줄지만, 프론트·백엔드가 다른 도메인이라 CORS `credentials`·`SameSite=None` 설정과 서드파티 쿠키 정책 문제가 생긴다 ([11-open-issues.md](11-open-issues.md) A7 세부, [12-decisions.md](12-decisions.md) §4 대안).

### 화면 3: 챗 (`/chat`) — 로그인 필수

```
┌─ 새 대화   context: 최근 5턴 ──────────────────────────────┐
│ ┌────────────────────────┐                                │
│ │안녕하세요. 무엇을 도와…    │  14:02                        │
│ └────────────────────────┘                                │
│                          ┌──────────────────────────────┐ │
│                          │ FastAPI에서 CORS 설정은…      │ 14:03
│                          └──────────────────────────────┘ │
│ ┌──────────────────────────────┐                          │
│ │ 현재 응답이 지연되고 있어요…     │ ← 주황 오류 말풍선          │
│ │ 504 · AI_TIMEOUT  [다시 시도]   │                          │
│ └──────────────────────────────┘                          │
│ ● ● ●  (응답 대기)                                          │
├────────────────────────────────────────────────────────────┤
│ [질문을 입력하세요 — Enter 전송, Shift+Enter 줄바꿈 ] [전송]   │
│ POST /api/chat                                  14 / 1000  │
└────────────────────────────────────────────────────────────┘
```

| 요소 | 동작 / 이유 |
|------|-------------|
| 진입 시 | `GET /api/me/chats?limit=20` 으로 **이전 대화 복원** → 새로고침해도 대화가 사라지지 않음 |
| 말풍선 3종 | 사용자(우측·청록) / 봇(좌측·회색) / 오류(좌측·주황 + `code · 구분 이름`) |
| 응답 표시 | **같은 화면에서** 대화 흐름 형태로 누적 (페이지 전환 없음) |
| 전송 | Enter 전송, Shift+Enter 줄바꿈, **한글 IME 조합 중 Enter 무시**(`isComposing` — 마지막 글자 중복 방지) |
| 낙관적 표시 | 사용자 말풍선을 즉시 추가 → 로딩 점 3개 → 응답/오류 말풍선 |
| 클라이언트 검증 | 공백만 / 로딩 중 → 전송 버튼 비활성, 1000자에서 입력 차단 + 카운터 주황 |
| textarea | 내용에 맞춰 최대 140px 까지 자동 높이 |
| 오류 후 | 입력창 포커스 복귀 → 새 질문도 바로 가능 (서비스가 살아 있음을 체감) |
| **[다시 시도] 버튼** | `code` 504·502 오류 말풍선에 표시. 누르면 **같은 질문으로 `POST /api/chat` 재호출** → 오류 말풍선을 로딩 점으로 바꾸고 결과로 교체. 요청 중에는 버튼·전송 비활성. **자동 재시도는 하지 않는다** ([03-api.md](03-api.md) §2-1) |
| 자동 스크롤 | 새 메시지/로딩 시 하단으로 부드럽게 |
| `aria-live="polite"` | 스크린리더가 새 응답을 읽어줌 |
| 느린 응답 안내 | 첫 요청이 5초 이상 걸리면 "서버를 깨우는 중입니다" 보조 문구 (Railway 슬리핑 사용 시 대응) |

### 화면 4: 내 대화 로그 (`/logs`) — 로그인 필수

```
내 대화 로그                                    ┌ 총 기록 ┐   [새로고침]
GET /api/me/chats — 로그인한 사용자 본인의 기록만    │   42   │
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ #987            2026-09-14 10:05 │ │ #986            2026-09-14 10:03 │
│ QUESTION  FastAPI에서 CORS…     │ │ QUESTION  배포 방법 알려줘        │
│ ──────────────────────────── │ │ ──────────────────────────── │
│ ANSWER  FastAPI에서는 CORS…     │ │ ANSWER  Railway 에 배포하려면…   │
└──────────────────────────────┘ └──────────────────────────────┘
                        [ 더 보기 ]   ← offset += limit
```

- 반응형 그리드 `minmax(min(100%, 380px), 1fr)` → 모바일 1열
- 상단에 `total` 표시, 하단 "더 보기" 로 `offset` 증가 (기본 `limit=20`)
- 비어 있으면 점선 박스 "아직 저장된 대화가 없습니다."

### 화면 5: 관리자 (`/admin`) — 관리자 필수

```
관리자                                                         [새로고침]
┌ 사용자 ┐ ┌ 대화 성공 ┐ ┌ 대화 실패 ┐ ┌ AI_TIMEOUT ┐ ┌ AI_CALL_FAILED ┐ ┌ 평균 응답 ┐
│  12   │ │   228    │ │    12    │ │     7      │ │       5        │ │ 1,320ms  │
└───────┘ └──────────┘ └──────────┘ └────────────┘ └────────────────┘ └──────────┘
[ 사용자 ]  [ AI 실패 기록 ]                                  ← 탭
┌─ 사용자 목록 ─────────────────┐ ┌─ user@example.com 의 대화 (44) ───────────┐
│ [이메일 검색          ]        │ │ #988 10:06  ERROR 504 · AI_TIMEOUT        │
│ ▸ user@example.com  42건 10:05 │ │   Q 긴 글 요약해줘          request 351990… │
│   other@example.com  3건 09:12 │ │ #987 10:05  SUCCESS 1,240ms               │
│              [ 더 보기 ]        │ │   Q FastAPI에서 CORS…  A FastAPI에서는…     │
└──────────────────────────────┘ └───────────────────────────────────────────┘
┌─ 요청 흐름  request_id 351990af2cf2 ───────────────────────────────────┐
│ 10:05:30 INFO  request_received  path=/api/chat                      │
│ 10:05:30 INFO  ai_call_start     context_turns=2                     │
│ 10:06:00 ERROR ai_call_failed    reason=timeout latency_ms=30000     │
│ 10:06:00 INFO  db_save_success   chat_id=988 status=error            │
└──────────────────────────────────────────────────────────────────────┘
```

| 영역 | API | 동작 |
|------|-----|------|
| 요약 카드 | `GET /api/admin/stats` | 진입 시 로드, [새로고침] 으로 재조회 |
| 사용자 목록 | `GET /api/admin/users?q=` | 이메일 검색(입력 후 300ms 디바운스), 더 보기 |
| 사용자별 대화 | `GET /api/admin/users/{id}/chats` | 목록에서 선택 시 오른쪽 패널, 성공(청록)/실패(주황) 배지, URL `?user=12` 유지 |
| AI 실패 기록 | `GET /api/admin/failures` | 탭 전환, 시각·사용자·`code · 구분`·request_id |
| 요청 흐름 | `GET /api/admin/requests/{request_id}/logs` | request_id 클릭 시 하단 타임라인, `code: 404` 면 "로그가 없습니다" |
| 권한 | – | `role≠admin` 이면 `/chat` 으로, API 가 `code: 403` 이면 "관리자만 접근할 수 있습니다" |
| 모바일 | – | ≤ 900px 에서 목록/대화 패널을 세로로 쌓음, 카드 2열 |

- 비밀번호 해시·토큰은 표시하지 않는다. 질문·응답 원문은 관리자에게 표시된다 ([11-open-issues.md](11-open-issues.md) G6).

## 4. API 호출 공통 모듈

Authorization 헤더 자동 첨부와 `{code, data}` 판단을 한 모듈에서 처리한다. 서버 응답은 **항상 HTTP 200** 이므로 axios 는 에러를 던지지 않고, 인터셉터가 `code` 를 보고 실패로 바꾼다.

파일은 역할별로 나눈다. `instance.ts` 는 **기본 설정과 인터셉터 등록만** 담고, 호출 함수는 두지 않는다.

```
src/
├── api/
│   ├── instance.ts          # axios.create + 인터셉터 등록
│   ├── interceptors/        # attachToken · normalize · refresh
│   ├── auth.ts / chat.ts / logs.ts   # 엔드포인트 함수
│   ├── ApiError.ts
│   └── types.ts
├── utils/tokenStorage.ts    # 토큰 읽기·쓰기·삭제 + 변경 구독 (아무것도 import 하지 않음)
├── hooks/useAccessToken.ts  # useSyncExternalStore 로 토큰 구독
└── store/AuthContext.tsx
```

```ts
// src/api/instance.ts
import axios from 'axios'

export const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 35_000,          // 서버 AI 타임아웃 30초 + 여유
})

// 요청: 토큰 자동 첨부
instance.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const UNREACHABLE = new ApiError(0, '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.')
const AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']

let refreshing: Promise<TokenPair> | null = null   // 재발급 single-flight

// (1) 응답 형식 정규화 — code 를 보고 성공/실패를 가른다
instance.interceptors.response.use(
  (res) => {
    const body = res.data
    if (typeof body?.code !== 'number') throw UNREACHABLE   // 응답 형식이 아님 = 서버에 닿지 못함
    if (body.code < 400) return body.data                   // 성공: data 만 반환
    throw new ApiError(body.code, body.data?.message ?? '요청을 처리하지 못했습니다.')
  },
  (error) => {
    if (axios.isCancel(error)) throw error                  // 요청 취소는 오류로 바꾸지 않는다
    throw UNREACHABLE                                       // 네트워크 끊김, Railway 앞단 502/503
  },
)

// (2) 401 → 재발급 1회 후 원요청 재시도
instance.interceptors.response.use(undefined, async (error) => {
  const config = error.config
  const isAuthApi = AUTH_PATHS.some((p) => config?.url?.endsWith(p))
  if (!(error instanceof ApiError) || error.code !== 401 || isAuthApi || config._retried) throw error

  try {
    refreshing ??= instance.post('/api/auth/refresh', { refresh_token: getRefreshToken() })
    const tokens = await refreshing
    saveTokens(tokens.access_token, tokens.refresh_token)    // 회전된 토큰 2개 저장
    return instance({ ...config, _retried: true })
  } catch {
    clearTokens()            // 저장소가 구독자에게 알림 → AuthContext 가 로그아웃 상태로 전환
    throw error
  } finally {
    refreshing = null
  }
})
```

**실패는 모두 `ApiError`(= `Error` 파생) 로 던진다.** 화면은 `catch (err)` 에서 `err.code` 로 분기한다.
인터셉터는 **형식 변환과 재발급까지만** 하고, "어떤 화면을 띄울지" 같은 비즈니스 분기는 하지 않는다.

**인터셉터 등록 순서가 중요하다.** 응답 인터셉터는 등록한 순서대로 실행되므로, (1) 정규화가 먼저 `code` 를 해석해야 (2) 재발급이 401 을 알아본다.

**재발급 실패 시 로그아웃 전달 방식.** 인터셉터는 `clearTokens()` 만 호출한다. `tokenStorage` 가 변경을 구독자에게 알리고, `useAccessToken`(`useSyncExternalStore`)이 이를 받아 `AuthContext` 의 `AuthStatus` 를 `anonymous` 로 바꿔 가드가 `/login` 으로 보낸다.
이 방식을 쓰는 이유는 **`api/` 가 `store/AuthContext` 를 import 하면 순환 참조가 생기기 때문**이다(`AuthContext → api/auth → instance → interceptors → AuthContext`). `tokenStorage` 는 아무것도 import 하지 않는 끝점이라 양쪽이 안전하게 참조할 수 있다.

로그인 API 의 401 은 폼에서 처리하고, 재발급 API 의 401 은 위 `catch` 에서 로그아웃으로 처리된다.

**요청 취소.** 엔드포인트 함수는 선택적 `signal?: AbortSignal` 을 받아 axios 에 넘긴다. 화면을 벗어나면 진행 중인 요청을 취소하고, 취소는 위 (1) 에서 오류로 바꾸지 않아 사용자에게 에러가 보이지 않는다. 화면에서는 `useAbortableRequest` 훅으로 감싸 쓴다.

**`refreshing` 변수 = 재발급 single-flight (중요).** refresh token 은 재발급마다 **회전**(이전 토큰 즉시 폐기)하므로,
동시에 401 을 받은 요청들이 각자 재발급하면 뒤늦은 쪽이 이미 폐기된 토큰을 써서 **사용자가 로그아웃된다.**
`refreshing` 에 진행 중인 Promise 를 담아 **재발급은 1회만 호출하고 나머지 요청은 그 결과를 함께 기다린다.**
챗 화면 진입(`/auth/me` + `/me/chats`)이나 관리자 화면(stats + users)처럼 한 화면에서 API 를 2개 이상 호출할 때 실제로 발생한다.
근거·대안·한계: [12-decisions.md](12-decisions.md) §15 · 검증: [07-verification.md](07-verification.md) B17c

## 5. 결과 코드별 사용자 메시지

화면 문구는 서버의 `data.message` 를 그대로 쓰고, 기술 표기(`504 · AI_TIMEOUT`)는 `code` 로 프론트가 붙인다.

| code | 구분(표기용) | 화면 표시 | 위치 |
|------|--------------|-----------|------|
| 422 | `VALIDATION_ERROR` | `data.message` (예: "질문은 1~1000자로 입력해 주세요.") | 폼 알림 / 오류 말풍선 |
| 409 | `EMAIL_ALREADY_EXISTS` | "이미 가입된 이메일입니다." | 회원가입 폼 |
| 401 (로그인 API) | `INVALID_CREDENTIALS` | "이메일 또는 비밀번호가 올바르지 않습니다." | 로그인 폼 |
| 401 (그 외) | `UNAUTHORIZED` | 먼저 refresh 로 재발급 후 재시도(사용자에게 안 보임). 재발급도 401 이면 로그인 화면으로 이동 (+ "다시 로그인해 주세요") | 전역 |
| 403 | `FORBIDDEN` | "관리자만 접근할 수 있습니다." | 관리자 화면 → `/chat` |
| 404 | `NOT_FOUND` | "요청한 정보를 찾을 수 없습니다." | 관리자 화면 |
| 504 | `AI_TIMEOUT` | "현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요." | 오류 말풍선 + [다시 시도] |
| 502 | `AI_CALL_FAILED` | "AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." | 오류 말풍선 + [다시 시도] |
| 500 | `INTERNAL_ERROR` | "서버 내부 오류가 발생했습니다." | 오류 말풍선 |
| (봉투 없음) | `NETWORK_ERROR` | "서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요." | 오류 말풍선 |

## 6. 오류 메시지 원칙

1. **무슨 일이 일어났는지 + 사용자가 할 일**을 한 문장으로 ("지연되고 있어요. 잠시 후 다시 시도해 주세요.")
2. 기술 코드는 작게 모노 폰트로 병기 (`504 · AI_TIMEOUT`) → 사용자는 문장, 개발자/평가자는 코드
3. 로그인 실패는 이메일/비밀번호 중 무엇이 틀렸는지 알리지 않음 (보안)
4. 빨강 대신 채도 낮은 주황 → 다크 톤 분위기 유지, 공포감 완화

## 7. 반응형

| 폭 | 레이아웃 |
|----|----------|
| ≥ 900px | 본문 최대 폭 안에서 2단(챗 + 보조 영역 / 관리자 목록 + 대화) 배치 |
| < 900px | 단일 열, 보조 영역은 아래로 |
| ≤ 560px | 헤더: 브랜드 1줄, 탭/사용자 2줄. 챗 높이 = 화면 - 220px. **가로 스크롤 0** |

## 8. 참고: 시안에 있으나 스펙 범위 밖인 요소

`docs/design/*.html` 및 `docs/screenshots/` 에는 아래 요소가 보인다. **현재 [features.md](features.md) / [03-api.md](03-api.md) 범위에는 없다.** 구현하려면 별도 API 가 필요하므로 팀 합의 후 추가한다.

| 요소 | 필요한 것 |
|------|-----------|
| "응답 시뮬레이션" 패널 (AI_TIMEOUT / AI_CALL_FAILED 강제 발생) | `POST /api/chat` 에 데모 전용 파라미터 + 서버 플래그 |
| 챗 화면 "서버 로그" 패널 (본인 요청 이벤트 실시간 표시) | `GET /api/me/server-logs` 같은 조회 API (관리자 요청 흐름 화면으로 대체 가능) |
| 헤더 연결 상태 점 (`/api/health`) | `GET /api/health` 엔드포인트 |
