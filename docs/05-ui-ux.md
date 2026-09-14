# 05. UI / UX 설계

> 담당: **이성준 (프론트엔드)** — [09-team.md](09-team.md) §3
> 스택: React · Vite · React Router · axios · Context API · **CSS Modules**
> 디자인 기준 시안: `docs/design/AI Chat Service.html` (다크 톤 · 청록 포인트 · 기술 정보는 모노 폰트)

## 1. 디자인 시스템

### 폰트

| 용도 | 폰트 | 사용처 |
|------|------|--------|
| 본문 | **IBM Plex Sans KR** (400/500/600) | 제목, 버튼, 말풍선, 폼 |
| 보조/기술 정보 | **IBM Plex Mono** (400/500) | 시각, 상태 코드, 엔드포인트 표기, 글자수 |

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
| `*` | `/chat` 또는 `/login` 으로 리다이렉트 | |

라우팅 가드는 `AuthContext` 의 상태로 판정한다. 앱 로드 시 `GET /api/auth/me` 응답 전에는 로딩 화면을 보여주고, 그 전에 판정하지 않는다(새로고침 시 로그인 화면이 잠깐 깜빡이는 문제 방지).

## 3. 화면 구성

### 공통 헤더 / 푸터

```
┌──────────────────────────────────────────────────────────────┐
│ [C] Chatlog (FastAPI · SQLite)   [챗|내 대화 로그]  어썸체크 [로그아웃] │  ← 로그인
│ [C] Chatlog (FastAPI · SQLite)                  [로그인] [회원가입]  │  ← 비로그인
└──────────────────────────────────────────────────────────────┘
```

- 헤더 sticky + blur. **인증 상태에 따라 메뉴가 완전히 다르게 표시** (평가 항목 "로그인/비로그인에 따라 보이는 메뉴 구분")
- 사용자 표시는 **닉네임** (이메일은 노출하지 않음)
- 로그아웃: 저장된 토큰 삭제 → `AuthContext` 초기화 → `/login` (서버 호출 없음)

### 화면 1: 회원가입 (`/signup`)

```
        회원가입
        ┌──────────────────────────────────┐
        │ 이메일     [user@example.com   ] │
        │ 비밀번호   [••••••••           ] │  8자 이상
        │ 닉네임     [어썸체크            ] │  1~20자
        │ [409] 이미 가입된 이메일입니다.  (주황) │
        │ [            가입하기           ] │
        │      이미 계정이 있나요? 로그인      │
        └──────────────────────────────────┘
        POST /api/auth/signup · 비밀번호는 bcrypt 로 해싱되어 저장됩니다
```

| 상호작용 | 동작 |
|----------|------|
| 클라이언트 검증 | 이메일 형식 / 비밀번호 8자 이상 / 닉네임 1~20자 → 실패 시 요청을 보내지 않음 |
| `409 EMAIL_ALREADY_EXISTS` | "이미 가입된 이메일입니다." + 이메일 필드 포커스 |
| `422 VALIDATION_ERROR` | 서버 메시지를 그대로 표시 |
| 성공 | `/login` 이동 + "가입이 완료되었습니다" 안내 + **이메일 자동 입력** |
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
| 성공 | `access_token` 저장 → `AuthContext` 갱신 → 원래 가려던 경로(`state.from`) 또는 `/chat` |
| `401 INVALID_CREDENTIALS` | 상태코드 칩 + 서버 메시지, **비밀번호 필드만 비움** (무엇이 틀렸는지 구분해서 알리지 않음) |
| 접근성 | `label` 연결, `autocomplete=email / current-password / new-password`, 오류 `role="alert"` |

**토큰 저장 위치**: `localStorage` vs 메모리 — [03-api.md](03-api.md) §6 의 미확정 항목. 프론트 담당이 결정하고 확정 시 이 문서와 03-api.md 를 함께 갱신한다.

| 선택지 | 장점 | 단점 |
|--------|------|------|
| `localStorage` | 새로고침·탭 재방문에도 로그인 유지 | XSS 시 탈취 가능 |
| 메모리(Context) | XSS 노출면 최소 | **새로고침하면 로그아웃** → "새로고침 시 로그인 상태 복원" 요구사항과 충돌 |

> 요구사항에 "새로고침 시 로그인 상태 복원(`GET /api/auth/me` 호출)" 이 있으므로, 메모리 저장만으로는 충족할 수 없다. 현재 유력안은 **localStorage + 짧은 만료(60분)**.

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
| 말풍선 3종 | 사용자(우측·청록) / 봇(좌측·회색) / 오류(좌측·주황 + `상태 · 코드`) |
| 응답 표시 | **같은 화면에서** 대화 흐름 형태로 누적 (페이지 전환 없음) |
| 전송 | Enter 전송, Shift+Enter 줄바꿈, **한글 IME 조합 중 Enter 무시**(`isComposing` — 마지막 글자 중복 방지) |
| 낙관적 표시 | 사용자 말풍선을 즉시 추가 → 로딩 점 3개 → 응답/오류 말풍선 |
| 클라이언트 검증 | 공백만 / 로딩 중 → 전송 버튼 비활성, 1000자에서 입력 차단 + 카운터 주황 |
| textarea | 내용에 맞춰 최대 140px 까지 자동 높이 |
| 오류 후 | 입력창 포커스 복귀 → 바로 재시도 가능 (서비스가 살아 있음을 체감) |
| 자동 스크롤 | 새 메시지/로딩 시 하단으로 부드럽게 |
| `aria-live="polite"` | 스크린리더가 새 응답을 읽어줌 |
| 콜드 스타트 안내 | 첫 요청이 5초 이상 걸리면 "서버를 깨우는 중입니다" 보조 문구 (Render 슬립 대응) |

### 화면 4: 내 대화 로그 (`/logs`) — 로그인 필수

```
내 대화 로그                                    ┌ 총 기록 ┐   [새로고침]
GET /api/me/chats — 로그인한 사용자 본인의 기록만    │   42   │
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ #987            2026-09-14 10:05 │ │ #986            2026-09-14 10:03 │
│ QUESTION  FastAPI에서 CORS…     │ │ QUESTION  배포 방법 알려줘        │
│ ──────────────────────────── │ │ ──────────────────────────── │
│ ANSWER  FastAPI에서는 CORS…     │ │ ANSWER  Render 에 배포하려면…    │
└──────────────────────────────┘ └──────────────────────────────┘
                        [ 더 보기 ]   ← offset += limit
```

- 반응형 그리드 `minmax(min(100%, 380px), 1fr)` → 모바일 1열
- 상단에 `total` 표시, 하단 "더 보기" 로 `offset` 증가 (기본 `limit=20`)
- 비어 있으면 점선 박스 "아직 저장된 대화가 없습니다."
- [features.md](features.md) F9 기준 **선택 항목**이지만, 평가지의 "DB 확인 수단" 을 화면으로 충족하므로 구현 권장

## 4. API 호출 공통 모듈

Authorization 헤더 자동 첨부와 에러 파싱을 한 모듈에서 처리한다.

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

// 응답: { error: { code, message } } 를 단일 형태로 파싱
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const body = err.response?.data?.error
    const code = body?.code ?? (err.response ? `HTTP_${err.response.status}` : 'NETWORK_ERROR')
    const message = body?.message ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    if (code === 'UNAUTHORIZED') window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    return Promise.reject({ status: err.response?.status ?? 0, code, message })
  },
)
```

`auth:unauthorized` → `AuthContext` 가 토큰 삭제 + `user=null` → 가드가 `/login` 으로 이동.

## 5. 에러 코드별 사용자 메시지

| code | HTTP | 화면 표시 | 위치 |
|------|------|-----------|------|
| `VALIDATION_ERROR` | 422 | 서버 메시지 그대로 (예: "질문은 1~1000자로 입력해 주세요.") | 폼 알림 / 오류 말풍선 |
| `EMAIL_ALREADY_EXISTS` | 409 | "이미 가입된 이메일입니다." | 회원가입 폼 |
| `INVALID_CREDENTIALS` | 401 | "이메일 또는 비밀번호가 올바르지 않습니다." | 로그인 폼 |
| `UNAUTHORIZED` | 401 | 안내 없이 로그인 화면으로 이동 (+ "다시 로그인해 주세요") | 전역 |
| `AI_TIMEOUT` | 504 | "현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요." | 오류 말풍선 |
| `AI_CALL_FAILED` | 502 | "AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." | 오류 말풍선 |
| `INTERNAL_ERROR` | 500 | "서버 내부 오류가 발생했습니다." | 오류 말풍선 |
| `NETWORK_ERROR` | – | "서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요." | 오류 말풍선 |

## 6. 오류 메시지 원칙

1. **무슨 일이 일어났는지 + 사용자가 할 일**을 한 문장으로 ("지연되고 있어요. 잠시 후 다시 시도해 주세요.")
2. 기술 코드는 작게 모노 폰트로 병기 (`504 · AI_TIMEOUT`) → 사용자는 문장, 개발자/평가자는 코드
3. 로그인 실패는 이메일/비밀번호 중 무엇이 틀렸는지 알리지 않음 (보안)
4. 빨강 대신 채도 낮은 주황 → 다크 톤 분위기 유지, 공포감 완화

## 7. 반응형

| 폭 | 레이아웃 |
|----|----------|
| ≥ 900px | 본문 최대 폭 안에서 2단(챗 + 보조 영역) 배치 가능 |
| < 900px | 단일 열, 보조 영역은 아래로 |
| ≤ 560px | 헤더: 브랜드 1줄, 탭/사용자 2줄. 챗 높이 = 화면 - 220px. **가로 스크롤 0** |

## 8. 참고: 시안에 있으나 스펙 범위 밖인 요소

`docs/design/*.html` 및 `docs/screenshots/` 에는 아래 요소가 보인다. **현재 [features.md](features.md) / [03-api.md](03-api.md) 범위에는 없다.** 구현하려면 별도 API 가 필요하므로 팀 합의 후 추가한다.

| 요소 | 필요한 것 |
|------|-----------|
| "응답 시뮬레이션" 패널 (AI_TIMEOUT / AI_CALL_FAILED 강제 발생) | `POST /api/chat` 에 데모 전용 파라미터 + 서버 플래그 |
| "서버 로그" 패널 (파이프라인 이벤트 실시간 표시) | `GET /api/me/server-logs` 같은 조회 API |
| 헤더 연결 상태 점 (`/api/health`) | `GET /api/health` 엔드포인트 |
