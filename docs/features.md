# 기능 리스트 (Backend / Frontend 분리)

> mission.md 필수 요구사항 기준 기능 명세. **우리가 만들어야 하는 목록**이다.
> 구조: **Backend = FastAPI**, **Frontend = React**, **DB = SQLite**, **배포 = Railway**
> API 상세: [03-api.md](03-api.md) · DB 상세: [04-database.md](04-database.md) · 미확정 항목: [11-open-issues.md](11-open-issues.md)

---

## 0. 구조 결정 근거

| 항목 | 내용 |
|------|------|
| 프론트 분리 허용 여부 | 허용. mission §3 "라우팅, 요청/응답, **템플릿 또는 프론트 연동**", §4-1 "형태 자유" |
| 필수 제약 | 백엔드 Python + FastAPI, DB SQLite 권장 (§5) |
| 인증 방식 | **JWT Bearer (PyJWT, HS256)** — 근거: docs/02-architecture.md §4 |
| 토큰 저장 위치 | **localStorage** (access·refresh), refresh 는 요청 body 전송 — 근거·XSS 대응: docs/12-decisions.md §4 |
| 프론트 언어 | **TypeScript (`strict: true`)** — 근거: docs/12-decisions.md §14 |
| AI API | **Codyssey AI API (COPA)** — docs/02-architecture.md §6 |
| 응답 형식 | **`{code, data}`, HTTP 항상 200** — 실패는 `data.message` (03-api.md §0) |
| 결과 코드 | 401 로그인 실패·인증 없음 / 403 관리자 아님 / 404 / 409 이메일 중복 / **422 입력 검증** / 500 / **502 AI 호출 실패** / **504 AI 타임아웃** |
| 관리자 기능 | **필수 채택** — mission §2-2 "관리자/내부 로그 확인 화면"(47줄), §4-4 "관리자 조회 API/화면"(92줄). `role=admin` 은 `.env` 시드로만, 조회 전용 (B15~B19, F10~F14) |
| 배포 방식 | **Railway 서비스 2개** — 프론트·백엔드 별도 도메인, 백엔드 CORS 필수, SQLite 는 Volume `/data` |

---

## 1. Backend (FastAPI)

| # | 기능 | 세부 | mission 근거 |
|---|------|------|--------------|
| B1 | 앱 기본 구성 | 설정 로딩(`.env`), SQLite 연결, CORS(개발 + Railway 프론트 도메인), **공통 응답 봉투·예외 핸들러**(422/404/405/500 도 `{code, data}`) | §5, §6 |
| B2 | DB 모델 | `users`(role), `chat_logs`(status·error_code·latency_ms·request_id), `server_logs` (아래 3절) | §4-4 |
| B3 | 회원가입 API | `POST /api/auth/signup` — email 중복 체크(409), 닉네임 중복 허용, bcrypt 해시 저장, role=user | §4-2 |
| B4 | 로그인·재발급·로그아웃 API | `POST /api/auth/login` — access(JWT)·refresh token 발급, refresh 는 해시로 `refresh_tokens` 저장, 실패 401 · `POST /api/auth/refresh` — 재발급(회전) · `POST /api/auth/logout` — refresh 행 삭제 · 만료 행 정리 스케줄러(시작 시 + 24시간마다). access 15분 / refresh 1일 | §4-2 |
| B5 | 현재 사용자 API | `GET /api/auth/me` — 로그인 상태 복원, `role` 포함 | §4-2 |
| B6 | 접근 제어 | `get_current_user` 의존성, 비로그인 시 `/api/chat`, `/api/me/*`, `/api/admin/*` → 401 | §4-2 |
| B7 | 챗 API | `POST /api/chat` — 수신 → 검증 → 컨텍스트 구성 → AI 호출 → DB 저장 → 응답 | §4-3 |
| B8 | AI 클라이언트 | `httpx.AsyncClient`, `COPA_API_KEY` 서버 환경변수 전용, 호출 전체 30초 타임아웃 | §4-3, §6 |
| B9 | 실패 처리 | 타임아웃 → 504 / 기타 → 502, `data.message` 안내, **실패도 `chat_logs` 에 status=error 저장**, 서버 유지, **서버 자동 재시도 없음** | §4-5, §6 |
| B10 | 컨텍스트 유지 | 동일 사용자 최근 N턴(`AI_CONTEXT_TURNS`) **성공** Q/A 를 messages 에 포함 | §4-3 |
| B11 | 입력 검증 | 빈 입력/공백 차단, 최대 1000자, 이메일 형식, 비밀번호 8자+, 닉네임 1~20 → 422 | §4-5 |
| B12 | 내 로그 조회 API | `GET /api/me/chats` — 토큰 사용자 기준, 성공 기록, `{total, items}` | §4-4, §2-2 |
| B13 | 서버 로그 | 4개 이벤트 필수 기록 + `request_id`, **파일/콘솔과 `server_logs` 테이블에 함께 저장** (아래 4절) | §4-5, §6 |
| B14 | 확인용 SQL | `scripts/check_logs.sql` — 사용자별·최근 대화·요청 흐름 조회 | §2-2 |
| B15 | 관리자 권한·시드 | `users.role`, `require_admin`(DB role 확인, 403), 시작 시 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 로 생성·승격, 감사 로그 `admin_access`/`admin_forbidden` | §2-2, §4-4 |
| B16 | 관리자 사용자 목록 | `GET /api/admin/users?q=` — 이메일·닉네임·가입일·대화 수·최근 대화 시각, 이메일 검색 | §4-4 |
| B17 | 관리자 사용자별 대화 | `GET /api/admin/users/{id}/chats` — 성공·실패 모두, 시각·질문·응답·상태 | §4-4 |
| B18 | 관리자 AI 실패 기록 | `GET /api/admin/failures` — 언제·누구·어떤 에러(504/502)·request_id | §4-5 |
| B19 | 관리자 통계·요청 흐름 | `GET /api/admin/stats` (사용자 수, 대화 성공/실패, 에러별 건수, 평균 응답시간) · `GET /api/admin/requests/{request_id}/logs` (`server_logs` 시간순) | §4-5 |

---

## 2. Frontend (React)

| # | 기능 | 세부 | mission 근거 |
|---|------|------|--------------|
| F1 | 프로젝트 구성 | **TypeScript(strict)** + Vite + React Router + axios, Node 24(`.nvmrc`), CSS Modules, `VITE_API_BASE_URL` (키 없음), API 응답 타입 정의 | §4-1 |
| F2 | 회원가입 페이지 | email·password·nickname 폼, 성공 시 로그인 페이지 이동, 실패 `data.message` 표시 | §4-2 |
| F3 | 로그인 페이지 | 폼, 성공 시 access·refresh token 저장 후 챗 페이지 이동, 실패 메시지 표시 | §4-2 |
| F4 | 인증 상태 관리 | 앱 로드 시 `/api/auth/me`(role), 헤더 로그인/로그아웃 표시, 로그아웃 버튼(`/api/auth/logout` 후 토큰 삭제) | §4-2 |
| F5 | 보호 라우트·토큰 재발급 | 비로그인 `/chat`·`/logs`·`/admin` → `/login`, 인증 API 외 `code:401` 수신 시 refresh 1회 후 재시도, 재발급 실패 시 로그인 이동 | §4-2 |
| F6 | 챗 화면 | 입력창 + 전송, 같은 화면에 질문/응답 말풍선 누적, 응답 대기 로딩 표시 | §4-1 |
| F7 | 오류 안내 | `code` 504/502/422/500 시 채팅창에 `data.message` 안내, 봉투 없는 응답 → "서버에 연결할 수 없습니다", 504·502 오류 말풍선에 **[다시 시도] 버튼**(같은 질문 재전송) | §4-5 |
| F8 | 클라이언트 입력 검증 | 빈 입력 전송 버튼 비활성, 글자 수 제한 (서버 검증 보조) | §4-5 |
| F9 | 내 대화 로그 화면 | `/logs` — `/api/me/chats` 카드 목록, total, 더 보기 | §4-4 |
| F10 | 관리자 가드·메뉴 | `RequireAdmin`(role≠admin → `/chat`), 관리자에게만 "관리자" 탭 표시 | §2-2, §4-4 |
| F11 | 관리자 통계 | `/admin` 상단 요약 카드 (사용자 수, 성공/실패, 에러별, 평균 응답시간) | §4-5 |
| F12 | 관리자 사용자 목록·대화 | 사용자 목록·이메일 검색 → 선택 시 사용자별 대화(성공·실패 표시) | §4-4 |
| F13 | 관리자 AI 실패 기록 | 실패 목록 (시각·사용자·에러·request_id) | §4-5 |
| F14 | 관리자 요청 흐름 | request_id 클릭 → 이벤트 타임라인 (request_received → ai_call_* → db_save_*) | §4-5 |

---

## 3. DB 구조

### users

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 사용자 식별자 |
| email | TEXT UNIQUE | 로그인 ID |
| hashed_password | TEXT | bcrypt 해시 |
| nickname | TEXT | 표시 이름 (중복 허용) |
| role | TEXT | `user` / `admin` |
| created_at | DATETIME | 가입 시각 |

### chat_logs

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 로그 식별자 |
| user_id | INTEGER FK → users.id | 사용자 식별 (필수 추적 필드) |
| question | TEXT | 사용자 질문 (필수 추적 필드) |
| answer | TEXT NULL | AI 응답 (필수 추적 필드, 실패 시 NULL) |
| status | TEXT | `success` / `error` |
| error_code | TEXT NULL | `AI_TIMEOUT` / `AI_CALL_FAILED` |
| latency_ms | INTEGER NULL | AI 응답시간 |
| request_id | TEXT | 요청 추적 ID |
| created_at | DATETIME | 생성 시각 (필수 추적 필드) |

### server_logs

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 로그 식별자 |
| request_id | TEXT | 요청 추적 ID |
| level | TEXT | INFO / WARN / ERROR |
| event | TEXT | 이벤트 이름 |
| user_id | INTEGER NULL | 사용자 |
| detail | TEXT NULL | key=value 부가 정보 (질문 원문·비밀값 금지) |
| created_at | DATETIME | 기록 시각 |

### refresh_tokens

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 식별자 |
| user_id | INTEGER FK → users.id | 토큰 소유자 |
| token_hash | TEXT UNIQUE | refresh token SHA-256 해시 (원문 저장 금지) |
| expires_at | DATETIME | 만료 시각 |
| created_at | DATETIME | 발급 시각 |

---

## 4. API 요약

| Method | Path | 인증 | 설명 |
|--------|------|:----:|------|
| POST | `/api/auth/signup` | – | 회원가입 |
| POST | `/api/auth/login` | – | 로그인 (access·refresh 발급) |
| POST | `/api/auth/refresh` | refresh | 토큰 재발급 |
| POST | `/api/auth/logout` | refresh | 로그아웃 (refresh 폐기) |
| GET | `/api/auth/me` | ✅ | 현재 사용자 (role) |
| POST | `/api/chat` | ✅ | 질문 → AI 응답 |
| GET | `/api/me/chats` | ✅ | 내 대화 로그 조회 |
| GET | `/api/admin/stats` | 🔒 | 요약 통계 |
| GET | `/api/admin/users` | 🔒 | 사용자 목록·검색 |
| GET | `/api/admin/users/{id}/chats` | 🔒 | 사용자별 대화 |
| GET | `/api/admin/failures` | 🔒 | AI 실패 기록 |
| GET | `/api/admin/requests/{request_id}/logs` | 🔒 | 요청 흐름 로그 |

### 응답 형식

```json
{ "code": 504, "data": { "message": "현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요." } }
```

| 상황 | code |
|------|:----:|
| 로그인 실패 / 비로그인·토큰 만료 | 401 |
| 관리자 아님 | 403 |
| 대상 없음 | 404 |
| 이메일 중복 | 409 |
| 입력 검증 실패 | 422 |
| AI 호출 실패 | 502 |
| AI 타임아웃 | 504 |

### 필수 서버 로그 이벤트

| 이벤트 | 예시 |
|--------|------|
| 요청 수신 | `request_received request_id=abc123 user_id=12 path=/api/chat` |
| AI 호출 | `ai_call_start request_id=abc123 user_id=12` |
| AI 응답/실패 | `ai_call_success latency_ms=1240` / `ai_call_failed reason=timeout` |
| DB 저장 | `db_save_success user_id=12 chat_id=987` / `db_save_failed ...` |
| 관리자 감사 | `admin_access admin_id=1 path=...` / `admin_forbidden user_id=12` |

---

## 5. 공통 / 산출물

| # | 항목 | mission 근거 |
|---|------|--------------|
| C1 | 저장소 구조 `backend/`, `frontend/`, `.env` 예시 파일(백엔드 `.env.example`, 프론트 `.env.development.example`·`.env.production.example`), 루트 `.gitignore`(`.env`, `node_modules`, `*.db`, `.venv`, `dist`) | §6 |
| C2 | 배포 — Railway 프론트 URL 로 외부 네트워크 접속, 백엔드 CORS·Volume 설정 | §2-1, §4-6 |
| C3 | README — 개요 / 구조 / API 명세(예시) / DB 구조 / 실행(백·프론트) / 환경변수 / 팀 역할 / 민감정보 관리 | §2-2 |
| C4 | Git — `main`/`develop`/`feature/*`, PR merge, 팀원별 커밋 10회 이상, 문서-이력 일치 | §4-7 |

---

## 6. 역할 분담

프론트엔드 **F1~F14 전체(관리자 화면 F10~F14 포함)는 이성준** 이 담당한다 ([09-team.md](09-team.md) §3, [11-open-issues.md](11-open-issues.md) G7).

백엔드는 **성원모 = 인증·DB·인프라**(B1~B6, B12, B14, C1~C4, `require_admin`·관리자 계정 시드 포함), **박성현 = AI 파이프라인·관리자 API**(B7~B11, B13 로그 기록, **B15~B19 관리자 API 5종 + 관리자 조회 CRUD**)가 담당한다 ([09-team.md](09-team.md), [11-open-issues.md](11-open-issues.md) C2·G7).

---

## 7. mission 대조 체크

| mission 요구사항 | 대응 기능 |
|------------------|-----------|
| §2-2 DB 확인 가이드 (API / 관리자 화면 / SQL) | B12, B16~B19, F9~F14, B14 |
| §4-1 웹 UI (질문 입력, 같은 화면 응답) | F6 |
| §4-2 회원가입/로그인 | B3, B4, F2, F3 |
| §4-2 인증 상태별 기능 구분, 챗은 로그인 사용자만 | B5, B6, F4, F5, F10 |
| §4-3 서버에서 AI 호출, 키 비노출 | B7, B8 |
| §4-3 컨텍스트 전략 | B10 |
| §4-4 질문/응답 누적 저장 (사용자·시각·질문·응답) | B2, B7 |
| §4-4 사용자 기준 조회/추적 | B12, B14, B16, B17 |
| §4-5 로그 4종 | B13, B19 |
| §4-5 AI 실패/타임아웃 시 비정상 종료 방지 + 오류 안내 | B9, F7, B18 |
| §4-5 입력 검증 1개 이상 | B11 (F8 보조) |
| §4-6 외부 접속 + 배포 문서 | C2, C3 |
| §4-7 브랜치/PR/커밋/역할 문서 | C4, 6절 |
| §6 민감정보 관리 | B8, C1, C3 |
