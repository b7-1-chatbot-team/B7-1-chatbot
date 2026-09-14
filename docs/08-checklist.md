# 08. 평가 대응 체크리스트

> 기준: [features.md](features.md) · [03-api.md](03-api.md) · [02-architecture.md](02-architecture.md) · 미확정·불일치: [11-open-issues.md](11-open-issues.md)
> 범례: ✅ 완료 · 🟡 진행/부분 · ⬜ 미착수

---

## 1. mission 요구사항 대조

### §2-1 최종 결과물 — 웹 기반 AI 챗봇 (FastAPI)

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 로그인 상태에서 웹 페이지로 텍스트 질문 입력 | ⬜ | features.md F11 (Chat 화면) |
| 서버가 질문 수신 후 AI API 호출해 응답 생성 | ⬜ | A1·A4 (`POST /api/chat` → Codyssey AI API) |
| AI 응답이 웹 화면에 표시 | ⬜ | F12 (같은 화면 누적) |
| 평가 시점 외부 네트워크에서 접속 가능한 URL | ⬜ | C3·C4 (Render + Vercel), docs/06 §6 |

### §2-2 프로젝트 산출물

| 요구 | 상태 | 위치 |
|------|:----:|------|
| GitHub Repository 링크 | ⬜ | 저장소 생성 후 README 기입 |
| 프로젝트 개요(문제·타겟·시나리오) | ✅ | [01-scenario.md](01-scenario.md), README §1 |
| 시스템 구조(아키텍처·컴포넌트 역할) | ✅ | [02-architecture.md](02-architecture.md) |
| API 명세(요청/응답 예시) | ✅ | [03-api.md](03-api.md), Swagger `/docs` |
| DB 구조(ERD·필드 설명) | ✅ | [04-database.md](04-database.md) |
| DB 확인 방법 안내 (1개 이상) | ✅ | ① `GET /api/me/chats` ② "내 대화 로그" 화면 ③ `scripts/check_logs.sql` — **3종** |
| 배포 및 실행 방법(환경변수 설정 포함) | ✅ | [06-deployment.md](06-deployment.md) |
| 환경변수 키 목록(이름 수준) | ✅ | docs/06 §3, `backend/.env.example` |
| 팀 구성원 역할 및 개인별 작업 요약 | 🟡 | [09-team.md](09-team.md) 계획 작성 → **실제 작업 후 커밋 수와 함께 갱신** |

### §4-1 웹 UI

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 질문 입력 웹 페이지 존재 | ⬜ | `/chat` |
| 질문 후 응답을 같은 화면에서 확인 | ⬜ | 단일 페이지 말풍선 누적 (페이지 전환 없음) |

### §4-2 사용자 인증 및 접근 제어

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 회원가입 정상 동작 | ⬜ | B8 (`POST /api/auth/signup`) — 검증 V01~V04 |
| 로그인 정상 동작 | ⬜ | B10 (JWT 발급) — V05·V06 |
| 인증 상태에 따라 기능 구분 | ⬜ | F9·F10 (라우팅 가드, 메뉴 분기) — B01 |
| 챗봇 질문/응답은 로그인 사용자만 | ⬜ | B12 (`get_current_user`) — V09 |
| 비밀번호 평문 저장 금지 | ⬜ | B9 (bcrypt) — V04 |

### §4-3 AI 챗봇 처리

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 서버가 질문 수신 → AI API 호출 → 응답 생성 | ⬜ | A1·A4 — V10 |
| AI 호출은 서버에서만, 키 클라이언트 미노출 | ⬜ | A5 (`COPA_API_KEY` 서버 전용) — D05 |
| 최소한의 컨텍스트 전략 | ⬜ | A7·A8 (최근 5턴, 오래된 것부터 제거) — V11·V12 |

### §4-4 대화 로그 저장 및 조회/추적

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 질문과 AI 응답 DB 누적 저장 | ⬜ | B6 (`chat_logs`) — V10, L5 |
| 최소 추적 필드: 사용자 식별·생성 시각·질문·응답 | ✅ (설계) | `user_id, created_at, question, answer` — docs/04 |
| 사용자 기준 로그 조회/추적 | ⬜ | B13 (`GET /api/me/chats`) — V18·V19 |

### §4-5 운영 및 유지보수

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 로그: 요청 수신 | ⬜ | `request_received` (A12) |
| 로그: AI 호출 | ⬜ | `ai_call_start` (A12) |
| 로그: AI 응답 수신 또는 실패 | ⬜ | `ai_call_success` / `ai_call_failed reason=` (A12) |
| 로그: DB 저장 성공·실패 | ⬜ | `db_save_success` / `db_save_failed` (B14) |
| AI 실패/타임아웃 시 비정상 종료 없음 | ⬜ | A9·A10 — V15~V17 |
| 사용자에게 오류 알림(메시지/상태코드/안내) | ⬜ | 504/502 + `{"error":{"code","message"}}` + F15 오류 말풍선 |
| 입력 검증 1개 이상 | ⬜ | A3 (빈 입력·1000자, **서버 필수**) + F13 (클라이언트 보조) — V13·V14 |

### §4-6 배포 및 접근성

| 요구 | 상태 | 대응 |
|------|:----:|------|
| 외부 네트워크 접속 가능 | ⬜ | Render + Vercel — D01·D02 |
| 배포/실행 방법·환경변수 문서화 | ✅ | docs/06 |

### §4-7 협업 및 형상관리

| 요구 | 상태 | 수행 방법 |
|------|:----:|-----------|
| 브랜치 전략 (main/develop) | ⬜ | docs/09 §2-1 |
| 기능 단위 작업 브랜치 흔적 | ⬜ | `feature/*` 계획 (docs/09 §4) |
| PR 기반 Merge 기록 | ⬜ | 모든 병합은 PR, main/develop 보호 규칙 |
| 팀원별 유의미한 커밋 10회 이상 | ⬜ | 계획 12~15회 (docs/09 §4) |
| 문서의 역할 기술이 Git 이력과 일치 | ⬜ | 마감 시 `git shortlog -sn` 으로 docs/09 §6 갱신 |

### §5 개발 환경 / §6 제약 사항

| 요구 | 상태 | 대응 |
|------|:----:|------|
| Python & FastAPI | ✅ (결정) | [02-architecture.md](02-architecture.md) §1 |
| SQLite, 평가자가 연결/조회 가능 | ✅ (결정) | `data/app.db` + `check_logs.sql` |
| 민감정보 코드/문서에 직접 작성 금지 | ⬜ | PR 리뷰 + `grep` |
| 모든 민감정보 환경변수 관리 | ⬜ | B2 (`config.py`) |
| `.env` 저장소 업로드 방지 | ⬜ | B15 (`.gitignore`) — D06 |
| README 에 환경변수 키 목록·설정 방법 | ✅ | README §5, docs/06 §3 |
| AI 호출 타임아웃 + 실패 시 오류 안내 | ⬜ | A6·A9·A10 — V15·V16 |
| 요청·AI 호출/응답·DB 저장 로그 | ⬜ | A12·B14 — V20·V21 |

---

## 2. 기능 번호 대조

> 이 절의 번호(A·B·F)는 [features.md](features.md) 번호 체계와 다르다 — [11-open-issues.md](11-open-issues.md) C6

### 이성준 — 프론트엔드 (React)

| 항목 | features.md | 상태 |
|------|-------------|:----:|
| 회원가입 화면 (이메일/비밀번호/닉네임) | F2 | ⬜ |
| 회원가입 실패 에러 분기 | F3 | ⬜ |
| 로그인 화면 | F4 | ⬜ |
| 로그인 성공 시 토큰 저장 | F5 | ⬜ |
| 로그아웃 (토큰 삭제 + 화면 전환) | F6 | ⬜ |
| 새로고침 시 로그인 상태 복원 | F7 | ⬜ |
| 인증 상태 전역 관리 | F8 | ⬜ |
| 라우팅 가드 | F9 | ⬜ |
| 메뉴 분기 | F10 | ⬜ |
| 질문 입력 UI | F11 | ⬜ |
| 같은 화면 응답 표시 | F12 | ⬜ |
| 클라이언트 입력 검증 | F13 | ⬜ |
| 로딩 상태 표시 | F14 | ⬜ |
| 에러 안내 (code별) | F15 | ⬜ |
| `UNAUTHORIZED` 시 로그인 이동 | F16 | ⬜ |
| API 호출 공통 모듈 | F17 | ⬜ |
| *(선택)* 내 대화 로그 화면 | F18 | ⬜ |

### 어썸체크 — 인증 / DB / 인프라

| 항목 | features.md | 상태 |
|------|-------------|:----:|
| `POST /api/auth/signup` | B8 | ⬜ |
| 비밀번호 해싱 | B9 | ⬜ |
| `POST /api/auth/login` + JWT | B10 | ⬜ |
| `GET /api/auth/me` | B11 | ⬜ |
| 인증 dependency (재사용 가능하게 분리) | B12 | ⬜ |
| `users` 스키마 | B5 | ⬜ |
| `chat_logs` 스키마 | B6 | ⬜ |
| DB 세션 관리 | B4 | ⬜ |
| CRUD 계층 분리 | B7 | ⬜ |
| `GET /api/me/chats` | B13 | ⬜ |
| DB 저장 성공/실패 로깅 | B14 | ⬜ |
| 프로젝트 구조 역할 단위 분리 | B1 | ⬜ |
| CORS 설정 | B3 | ⬜ |
| 환경변수 로딩 | B2 | ⬜ |
| `.env.example` | B2 | ⬜ |
| `.gitignore` | B15 | ⬜ |
| 레포 생성 · 브랜치 전략 | C1 | ⬜ |
| PR 템플릿/규칙 | C2 | ⬜ |
| 배포 환경 구성 | C3 | ⬜ |
| 외부 접속 URL 확보 | C4 | ⬜ |
| README 총괄 | C5 | 🟡 |

### 박성현A — AI 파이프라인

| 항목 | features.md | 상태 |
|------|-------------|:----:|
| `POST /api/chat` (인증 적용) | A1 | ⬜ |
| 요청/응답 Pydantic 스키마 | A2 | ⬜ |
| 서버 측 입력 검증 | A3 | ⬜ |
| AI API 클라이언트 모듈 분리 | A4 | ⬜ |
| 키 환경변수 로드 | A5 | ⬜ |
| 타임아웃 설정 | A6 | ⬜ |
| 컨텍스트 유지 로직 | A7 | ⬜ |
| 컨텍스트 길이 초과 방지 | A8 | ⬜ |
| `AI_TIMEOUT` 응답 | A9 | ⬜ |
| `AI_CALL_FAILED` 응답 | A10 | ⬜ |
| 사용자 안내 메시지 | A11 | ⬜ |
| 로그 4종 | A12 | ⬜ |

### 공통 — 문서 & 협업

| 항목 | 상태 | 위치 |
|------|:----:|------|
| 프로젝트 개요 | ✅ | docs/01, README §1 |
| 시스템 구조 | ✅ | docs/02, README §2 |
| API 명세 | ✅ | docs/03, README §3 |
| DB 구조 | ✅ | docs/04, README §4 |
| DB 확인 방법 안내 | ✅ | docs/04 |
| 배포 및 실행 방법 | ✅ | docs/06, README §5 |
| 환경변수 키 목록 | ✅ | docs/06 §3 |
| 팀 역할 및 개인별 작업 요약 | 🟡 | docs/09, README §6 |
| 기능 단위 작업 브랜치 흔적 | ⬜ | |
| PR 기반 머지 기록 | ⬜ | |
| 어썸체크 — 커밋 10회 이상 | ⬜ | |
| 이성준 — 커밋 10회 이상 | ⬜ | |
| 박성현A — 커밋 10회 이상 | ⬜ | |
| 역할 설명 ↔ Git 이력 일치 확인 | ⬜ | |

---

## 3. 참조 구현(PoC) ↔ 스펙 차이

`backend/`, `frontend/` 의 현재 코드는 스펙 확정 이전에 만든 참조 구현이다. 스펙대로 구현할 때 **반드시 바꿔야 하는 지점**은 다음과 같다.

| 항목 | PoC 현재 코드 | 팀 스펙 (목표) |
|------|---------------|----------------|
| 인증 방식 | 서버 세션 + HttpOnly 쿠키 (`sessions` 테이블) | **JWT Bearer** (PyJWT, HS256, 60분) |
| 계정 필드 | `username` + `password` | **`email` + `password` + `nickname`** |
| 로그아웃 | `POST /api/auth/logout` (세션 삭제) | **API 없음** — 프론트가 토큰 삭제 |
| AI 공급자 | Anthropic Claude (`anthropic` SDK) + mock | **Codyssey AI API (COPA) + httpx** |
| 에러 응답 | `{"error","message","request_id"}` (평면) | **`{"error":{"code","message"}}` (중첩)** |
| 입력 검증 실패 | `400 INVALID_INPUT` | **`422 VALIDATION_ERROR`** |
| 이메일 중복 | `409 USERNAME_TAKEN` | **`409 EMAIL_ALREADY_EXISTS`** |
| AI 타임아웃 | `503 AI_TIMEOUT` | **`504 AI_TIMEOUT`** |
| AI 실패 | `503 AI_ERROR` | **`502 AI_CALL_FAILED`** |
| 챗 응답 | `{chat_id, answer, latency_ms, context_turns, saved, request_id, created_at}` | **`{chat_id, question, answer, created_at}`** |
| 로그 응답 | `{items, count, avg_latency_ms}`, `limit` only | **`{total, items}`, `limit` + `offset`** |
| `chat_logs` 컬럼 | + `status`, `error_code`, `latency_ms`, `request_id` | **question / answer / created_at / user_id 만** |
| 세션 테이블 | `sessions` 존재 | **없음** |
| 추가 엔드포인트 | `/api/health`, `/api/config`, `/api/me/server-logs`, `simulate` 파라미터 | **스펙에 없음** (필요하면 팀 합의 후 추가) |
| 백엔드 구조 | `app/*.py` 평면 | **`routers/ services/ crud/ models/ schemas/ core/`** |
| 프론트 HTTP | `fetch` 래퍼 | **axios + 인터셉터** |
| 프론트 스타일 | 자체 CSS (`styles.css`) | **CSS Modules** |
| 배포 | Ubuntu VM + Nginx + systemd + certbot | **Render(백) + Vercel(프론트)** |
| CORS | 동일 도메인이라 사실상 불필요 | **필수** (도메인 분리) |

> 스펙 전환 후에도 그대로 쓸 수 있는 검증 항목은 [07-verification.md](07-verification.md) §4-4 참고.

---

## 4. 평가 당일 체크리스트

- [ ] 서비스 URL 이 **휴대폰 데이터망**에서 열린다
- [ ] Render 백엔드를 미리 한 번 호출해 **슬립에서 깨워 둔다**
- [ ] 회원가입 → 로그인 → 질문 → 응답 → 로그 조회 전체 흐름 시연 준비
- [ ] 비로그인 상태에서 챗 기능이 막히는지 확인
- [ ] AI API 실패 상황을 의도적으로 재현해 에러 안내가 나오는지 확인
- [ ] `sqlite3 backend/data/app.db < backend/scripts/check_logs.sql` 시연 준비
- [ ] 서버 로그(`request_received → ai_call_* → db_save_*`) 시연 준비
- [ ] 레포에 `.env` 가 올라가지 않았는지 확인 — `git ls-files | grep -E '(^|/)\.env$'`
- [ ] 코드 어디에도 API 키가 하드코딩되어 있지 않은지 검색으로 확인
- [ ] `git log --merges --oneline` 에 PR 머지 기록
- [ ] `git shortlog -sn` 팀원 3명 모두 10 이상, README 역할표와 일치
- [ ] README 서비스 URL / Repository 링크 기입
