# 08. 평가 대응 체크리스트

> 기준: [features.md](features.md) · [03-api.md](03-api.md) · [02-architecture.md](02-architecture.md) · 미확정·불일치: [11-open-issues.md](11-open-issues.md)
> 범례: ✅ 완료 · 🟡 진행/부분 · ⬜ 미착수 — **실제 진행 기준** (설계 문서만 있으면 ⬜ 또는 "(설계)")

---

## 1. mission 요구사항 대조

### §2-1 최종 결과물 — 웹 기반 AI 챗봇 (FastAPI)

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 로그인 상태에서 웹 페이지로 텍스트 질문 입력 | ⬜ | features.md F6 (Chat 화면) |
| 서버가 질문 수신 후 AI API 호출해 응답 생성 | ⬜ | B7·B8 (`POST /api/chat` → Codyssey AI API) |
| AI 응답이 웹 화면에 표시 | ⬜ | F6 (같은 화면 누적) |
| 평가 시점 외부 네트워크에서 접속 가능한 URL | 🟡 | C2 — Railway 서비스 2개 첫 배포 시도 (프론트 성공, 백엔드 기동 실패), docs/06 §6 |

### §2-2 프로젝트 산출물

| 요구 | 상태 | 위치 |
|------|:----:|------|
| GitHub Repository 링크 | 🟡 | 저장소 생성됨(`b7-1-chatbot-team/B7-1-chatbot`), README 기입 전 |
| 프로젝트 개요(문제·타겟·시나리오) | ✅ | [01-scenario.md](01-scenario.md) |
| 시스템 구조(아키텍처·컴포넌트 역할) | ✅ | [02-architecture.md](02-architecture.md) |
| API 명세(요청/응답 예시) | ✅ | [03-api.md](03-api.md), Swagger `/docs` |
| DB 구조(ERD·필드 설명) | ✅ | [04-database.md](04-database.md) |
| DB 확인 방법 안내 (1개 이상) | ⬜ (설계) | ① `GET /api/me/chats`·`/api/admin/*` ② "내 대화 로그"·**관리자 화면** ③ `scripts/check_logs.sql` — 구현 전 |
| 배포 및 실행 방법(환경변수 설정 포함) | 🟡 | [06-deployment.md](06-deployment.md) — Railway 절차 작성, 실제 배포 검증 전 |
| 환경변수 키 목록(이름 수준) | 🟡 | docs/06 §3 작성, `backend/.env.example` 없음 |
| 팀 구성원 역할 및 개인별 작업 요약 | 🟡 | [09-team.md](09-team.md) 계획 작성 → **실제 작업 후 커밋 수와 함께 갱신** (역할 버전 불일치 C1~C3) |

### §4-1 웹 UI

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 질문 입력 웹 페이지 존재 | ⬜ | `/chat` |
| 질문 후 응답을 같은 화면에서 확인 | ⬜ | 단일 페이지 말풍선 누적 (페이지 전환 없음) |

### §4-2 사용자 인증 및 접근 제어

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 회원가입 정상 동작 | ⬜ | B3 (`POST /api/auth/signup`) — V01~V04 |
| 로그인 정상 동작 | ⬜ | B4 (JWT 발급) — V05·V06 |
| 인증 상태에 따라 기능 구분 | ⬜ | F4·F5·F10 (라우팅 가드, 메뉴 분기, 관리자 탭) — B01·B20 |
| 챗봇 질문/응답은 로그인 사용자만 | ⬜ | B6 (`get_current_user`) — V09 |
| 비밀번호 평문 저장 금지 | ⬜ | B3 (bcrypt) — V04 |

### §4-3 AI 챗봇 처리

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 서버가 질문 수신 → AI API 호출 → 응답 생성 | 🟡 | 골격만 (`backend/main.py` `POST /chat`), B7 스펙 구현 전 — V10 |
| AI 호출은 서버에서만, 키 클라이언트 미노출 | 🟡 | `COPA_API_KEY` 서버 환경변수 사용 중, B8 — D05 |
| 최소한의 컨텍스트 전략 | ⬜ | B10 (최근 5턴 성공 Q/A, 오래된 것부터 제거) — V11·V12 |

### §4-4 대화 로그 저장 및 조회/추적

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 질문과 AI 응답 DB 누적 저장 | ⬜ | B2·B7 (`chat_logs`) — V10, L5 |
| 최소 추적 필드: 사용자 식별·생성 시각·질문·응답 | ✅ (설계) | `user_id, created_at, question, answer` — docs/04 |
| 사용자 기준 로그 조회/추적 | ⬜ | B12 (`GET /api/me/chats`) · B16·B17 (관리자) — V18·V19·V34·V35 |

### §4-5 운영 및 유지보수

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 로그: 요청 수신 | ⬜ | `request_received` (B13) |
| 로그: AI 호출 | ⬜ | `ai_call_start` (B13) |
| 로그: AI 응답 수신 또는 실패 | ⬜ | `ai_call_success` / `ai_call_failed reason=` (B13) |
| 로그: DB 저장 성공·실패 | ⬜ | `db_save_success` / `db_save_failed` (B13) |
| AI 실패/타임아웃 시 비정상 종료 없음 | ⬜ | B9 — V15~V17 |
| 사용자에게 오류 알림(메시지/상태코드/안내) | ⬜ | `{code: 504/502, data:{message}}` + F7 오류 말풍선 |
| 입력 검증 1개 이상 | ⬜ | B11 (빈 입력·1000자, **서버 필수**, `code: 422`) + F8 (클라이언트 보조) — V13·V14 |
| (관리자) 실패 원인 추적 | ⬜ | B18·B19, F13·F14 — V36·V37 |

### §4-6 배포 및 접근성

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 외부 네트워크 접속 가능 | 🟡 | Railway — 프론트 배포 성공, 백엔드 기동 실패, CORS 미검증 — D01~D04 |
| 배포/실행 방법·환경변수 문서화 | 🟡 | docs/06 (Railway) — 실제 배포 후 검증 필요 |

### §4-7 협업 및 형상관리

| 요구 | 상태 | 수행 방법 |
|------|:----:|-----------|
| 브랜치 전략 (main/develop) | 🟡 | main·develop 존재. 보호 규칙 설정 여부 미확인 (docs/09 §2-1) |
| 기능 단위 작업 브랜치 흔적 | 🟡 | `feature/setup`, `feature/fe-setup` |
| PR 기반 Merge 기록 | 🟡 | PR #2·#3·#4 머지 (Merge commit) |
| 팀원별 유의미한 커밋 10회 이상 | ⬜ | 계획 12~15회 (docs/09 §4) |
| 문서의 역할 기술이 Git 이력과 일치 | ⬜ | 마감 시 `git shortlog -sn` 으로 docs/09 §6 갱신 |

### §5 개발 환경 / §6 제약 사항

| 요구 | 상태 | 대응 |
|------|:----:|------|
| Python & FastAPI | ✅ (결정) | [02-architecture.md](02-architecture.md) §1 |
| SQLite, 평가자가 연결/조회 가능 | ✅ (결정) | Railway Volume `/data/app.db` + `check_logs.sql` |
| 민감정보 코드/문서에 직접 작성 금지 | 🟡 | 현재 코드는 환경변수 사용, PR 리뷰 + `git grep` |
| 모든 민감정보 환경변수 관리 | 🟡 | `COPA_API_KEY` 환경변수, B1 (`config.py`) 구현 전 |
| `.env` 저장소 업로드 방지 | 🟡 | 루트 `.gitignore` 에 `.env` 있음 (`*.db`·`node_modules` 누락 — E12) — D08 |
| README 에 환경변수 키 목록·설정 방법 | ⬜ | README 위치·내용 정리 필요 (D3·E8), docs/06 §3 |
| AI 호출 타임아웃 + 실패 시 오류 안내 | 🟡 | 현재 코드 `timeout=30` 만 있고 예외 처리 없음 (E11) — V15·V16 |
| 요청·AI 호출/응답·DB 저장 로그 | ⬜ | B13 — V20·V21 |

---

## 2. 기능 번호 대조

> 이 절의 번호는 [features.md](features.md) 기준이다. [09-team.md](09-team.md) §3·§4 의 번호 체계는 다르다 — [11-open-issues.md](11-open-issues.md) C6

### Backend

| 항목 | features.md | 상태 |
|------|-------------|:----:|
| 앱 기본 구성·공통 응답 봉투·CORS | B1 | ⬜ |
| DB 모델 (users·chat_logs·server_logs) | B2 | ⬜ |
| 회원가입 API | B3 | ⬜ |
| 로그인·재발급·로그아웃 API (access·refresh token) | B4 | ⬜ |
| 현재 사용자 API (role) | B5 | ⬜ |
| 인증 dependency | B6 | ⬜ |
| 챗 API | B7 | 🟡 골격 |
| AI 클라이언트 (Codyssey) | B8 | 🟡 골격 |
| 실패 처리 504/502 + 실패 저장 | B9 | ⬜ |
| 컨텍스트 유지 | B10 | ⬜ |
| 입력 검증 422 | B11 | ⬜ |
| 내 로그 조회 API | B12 | ⬜ |
| 서버 로그 (+ `server_logs`) | B13 | ⬜ |
| 확인용 SQL | B14 | ⬜ |
| 관리자 권한·시드·감사 로그 | B15 | ⬜ |
| 관리자 사용자 목록 | B16 | ⬜ |
| 관리자 사용자별 대화 | B17 | ⬜ |
| 관리자 AI 실패 기록 | B18 | ⬜ |
| 관리자 통계·요청 흐름 | B19 | ⬜ |

### Frontend

| 항목 | features.md | 상태 |
|------|-------------|:----:|
| 프로젝트 구성 (TypeScript·Vite·React·Router·axios·CSS Modules·Node 24) | F1 | 🟡 라이브러리 셋업 (PR #4), TypeScript 전환 예정 |
| 회원가입 화면 | F2 | ⬜ |
| 로그인 화면 | F3 | ⬜ |
| 인증 상태 관리 | F4 | ⬜ |
| 보호 라우트 | F5 | ⬜ |
| 챗 화면 | F6 | ⬜ |
| 오류 안내 | F7 | ⬜ |
| 클라이언트 입력 검증 | F8 | ⬜ |
| 내 대화 로그 화면 | F9 | ⬜ |
| 관리자 가드·메뉴 | F10 | ⬜ |
| 관리자 통계 | F11 | ⬜ |
| 관리자 사용자 목록·대화 | F12 | ⬜ |
| 관리자 AI 실패 기록 | F13 | ⬜ |
| 관리자 요청 흐름 | F14 | ⬜ |

### 공통 — 문서 & 협업

| 항목 | 상태 | 위치 |
|------|:----:|------|
| 프로젝트 개요 | ✅ | docs/01 |
| 시스템 구조 | ✅ | docs/02 |
| API 명세 | ✅ | docs/03 |
| DB 구조 | ✅ | docs/04 |
| DB 확인 방법 안내 | ✅ (문서) | docs/04 |
| 배포 및 실행 방법 | 🟡 | docs/06 (Railway, 검증 전) |
| 환경변수 키 목록 | ✅ (문서) | docs/06 §3 |
| 팀 역할 및 개인별 작업 요약 | 🟡 | docs/09 |
| 기능 단위 작업 브랜치 흔적 | 🟡 | feature/setup, feature/fe-setup |
| PR 기반 머지 기록 | 🟡 | PR #2~#4 |
| 성원모 — 커밋 10회 이상 | ⬜ | |
| 박성현 — 커밋 10회 이상 | ⬜ | |
| 이성준 — 커밋 10회 이상 | ⬜ | |
| 역할 설명 ↔ Git 이력 일치 확인 | ⬜ | |

---

## 3. 참조 구현(PoC) ↔ 스펙 차이

이전에 만든 참조 구현(PoC, 이 저장소에는 없음)과 팀 스펙의 차이다. PoC 를 참고할 때 **반드시 바꿔야 하는 지점**이다.

| 항목 | PoC | 팀 스펙 (목표) |
|------|-----|----------------|
| 인증 방식 | 서버 세션 + HttpOnly 쿠키 (`sessions` 테이블) | **JWT Bearer access token** (PyJWT, HS256) + **refresh token** (`refresh_tokens` 테이블) |
| 계정 필드 | `username` + `password` | **`email` + `password` + `nickname`(중복 허용)** |
| 로그아웃 | `POST /api/auth/logout` (세션 삭제) | **`POST /api/auth/logout` (refresh token 행 삭제)** + `POST /api/auth/refresh` |
| AI 공급자 | Anthropic Claude (`anthropic` SDK) + mock | **Codyssey AI API (COPA) + httpx** |
| 응답 형식 | `{"error","message","request_id"}` (평면), HTTP 상태코드 사용 | **`{code, data}`, HTTP 항상 200** |
| 입력 검증 실패 | `400 INVALID_INPUT` | **`code: 422`** |
| 이메일 중복 | `409 USERNAME_TAKEN` | **`code: 409`** |
| AI 타임아웃 | `503 AI_TIMEOUT` | **`code: 504`** |
| AI 실패 | `503 AI_ERROR` | **`code: 502`** |
| 챗 응답 | `{chat_id, answer, latency_ms, context_turns, saved, request_id, created_at}` | **`data: {chat_id, question, answer, created_at}`** |
| 로그 응답 | `{items, count, avg_latency_ms}`, `limit` only | **`data: {total, items}`, `limit` + `offset`** |
| `chat_logs` 컬럼 | + `status`, `error_code`, `latency_ms`, `request_id` | **동일하게 채택** (관리자 실패 기록용) |
| 서버 로그 저장 | 파일 + 메모리 링버퍼 | **파일 + `server_logs` 테이블** |
| 관리자 | stats · users · users/{id}/chats | **+ failures · requests/{request_id}/logs** |
| 세션 테이블 | `sessions` 존재 | **없음** (대신 `refresh_tokens`) |
| 추가 엔드포인트 | `/api/health`, `/api/config`, `/api/me/server-logs`, `simulate` 파라미터 | **스펙에 없음** (필요하면 팀 합의 후 추가) |
| 백엔드 구조 | `app/*.py` 평면 | **`routers/ services/ crud/ models/ schemas/ core/`** |
| 프론트 HTTP | `fetch` 래퍼 | **axios + 인터셉터** |
| 프론트 스타일 | 자체 CSS (`styles.css`) | **CSS Modules** |
| 프론트 언어 | JavaScript (JSX) | **TypeScript (strict)** |
| 배포 | Ubuntu VM + Nginx + systemd + certbot | **Railway 서비스 2개 (프론트·백엔드 별도 도메인, Volume)** |
| CORS | 동일 도메인이라 사실상 불필요 | **필수** (도메인 분리) |

> 스펙 전환 후에도 그대로 쓸 수 있는 검증 항목은 [07-verification.md](07-verification.md) §4-4 참고.

---

## 4. 평가 당일 체크리스트

- [ ] Railway 프론트 URL 이 **휴대폰 데이터망**에서 열린다
- [ ] Railway **Serverless(슬리핑)가 꺼져 있다** (첫 요청 지연·502 방지)
- [ ] 브라우저 Console 에 **CORS 오류가 없다**
- [ ] 회원가입 → 로그인 → 질문 → 응답 → 로그 조회 전체 흐름 시연 준비
- [ ] 관리자 계정으로 통계 → 사용자별 대화 → AI 실패 기록 → 요청 흐름 시연 준비
- [ ] 비로그인 상태에서 챗 기능이 막히고, 일반 사용자는 관리자 화면에 못 들어가는지 확인
- [ ] AI API 실패 상황을 의도적으로 재현해 에러 안내가 나오는지 확인
- [ ] `sqlite3 backend/data/app.db < backend/scripts/check_logs.sql` 시연 준비 (Railway 는 관리자 화면으로 대체)
- [ ] 서버 로그(`request_received → ai_call_* → db_save_*`) 시연 준비
- [ ] 레포에 `.env` 가 올라가지 않았는지 확인 — `git ls-files | grep -E '(^|/)\.env$'`
- [ ] 코드 어디에도 API 키가 하드코딩되어 있지 않은지 검색으로 확인
- [ ] `git log --merges --oneline` 에 PR 머지 기록
- [ ] `git shortlog -sn` 팀원 3명 모두 10 이상, README 역할표와 일치
- [ ] README 서비스 URL / Repository 링크 기입
