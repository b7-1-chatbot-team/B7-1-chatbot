# 05. UI / UX 설계

> 담당: **이성준 (프론트엔드)** — [09-team.md](09-team.md) §3 (관리자 화면 담당은 [11-open-issues.md](11-open-issues.md) G7)
> 스택: React · Vite · React Router · axios · Context API · **CSS Modules**
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

라우팅 가드는 `AuthContext` 의 상태(`user`, `user.role`)로 판정한다. 앱 로드 시 `GET /api/auth/me` 응답 전에는 로딩 화면을 보여주고, 그 전에 판정하지 않는다(새로고침 시 로그인 화면이 잠깐 깜빡이는 문제 방지).
프론트 가드는 화면 이동용이며, **권한 검사는 서버 `require_admin` 이 최종**이다.

## 3. 화면 구성

### 공통 헤더 / 푸터

```
┌──────────────────────────────────────────────────────────────────────┐
│ [C] Chatlog (FastAPI · SQLite)  [챗|내 대화 로그|관리자]  어썸체크 [로그아웃] │  ← 관리자
│ [C] Chatlog (FastAPI · SQLite)  [챗|내 대화 로그]         어썸체크 [로그아웃] │  ← 로그인
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

**토큰 저장 위치** (access·refresh 모두): `localStorage` vs 메모리 — [03-api.md](03-api.md) §7 의 미확정 항목. 프론트 담당이 결정하고 확정 시 이 문서와 03-api.md 를 함께 갱신한다.

| 선택지 | 장점 | 단점 |
|--------|------|------|
| `localStorage` | 새로고침·탭 재방문에도 로그인 유지 | XSS 시 탈취 가능 |
| 메모리(Context) | XSS 노출면 최소 | **새로고침하면 로그아웃** → "새로고침 시 로그인 상태 복원" 요구사항과 충돌 |

> 요구사항에 "새로고침 시 로그인 상태 복원(`GET /api/auth/me` 호출)" 이 있으므로, 메모리 저장만으로는 충족할 수 없다. 현재 유력안은 **localStorage + 짧은 access 만료**.
> refresh token 은 수명이 길어 탈취 시 영향이 크다. 쿠키(HttpOnly)로 옮기면 크로스 도메인이라 CORS `credentials`·`SameSite=None` 설정이 추가로 필요하다 ([11-open-issues.md](11-open-issues.md) A7 세부).

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
│ │ 504 · AI_TIMEOUT              │                          │
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
| 오류 후 | 입력창 포커스 복귀 → 바로 재시도 가능 (서비스가 살아 있음을 체감) |
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

```js
// src/api/client.js
import axios from 'axios'

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// 요청: 토큰 자동 첨부
client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const UNREACHABLE = { code: 0, message: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.' }

const AUTH_PATHS = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']
let refreshing = null   // 동시에 여러 요청이 401 을 받아도 재발급은 1번만

client.interceptors.response.use(
  async (res) => {
    const body = res.data
    // 봉투가 아닌 응답 → 서버에 닿지 못함
    if (typeof body?.code !== 'number') return Promise.reject(UNREACHABLE)
    if (body.code < 400) return body.data                     // 성공: data 만 반환

    const isAuthApi = AUTH_PATHS.some((p) => res.config.url.endsWith(p))
    // 인증 API 가 아닌 요청의 401 → refresh 1회 후 재시도
    if (body.code === 401 && !isAuthApi && !res.config._retried) {
      try {
        refreshing ??= client.post('/api/auth/refresh', { refresh_token: getRefreshToken() })
        saveTokens(await refreshing)                           // 새 access·refresh 저장
        return client({ ...res.config, _retried: true })       // 원래 요청 재시도
      } catch {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      } finally {
        refreshing = null
      }
    }
    return Promise.reject({ code: body.code, message: body.data?.message ?? '요청을 처리하지 못했습니다.' })
  },
  // 네트워크 끊김, Railway 앞단 502/503 등 실제 HTTP 오류
  () => Promise.reject(UNREACHABLE),
)
```

`auth:unauthorized` → `AuthContext` 가 두 토큰 삭제 + `user=null` → 가드가 `/login` 으로 이동.
로그인 API 의 401 은 폼에서, 재발급 API 의 401 은 위 `catch` 에서 로그아웃으로 처리된다.

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
| 504 | `AI_TIMEOUT` | "현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요." | 오류 말풍선 |
| 502 | `AI_CALL_FAILED` | "AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." | 오류 말풍선 |
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
