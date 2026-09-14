# 기능 리스트 (Backend / Frontend 분리)

> mission.md 필수 요구사항 기준 기능 명세. 보너스 없음.
> 구조: **Backend = FastAPI**, **Frontend = React**, **DB = SQLite**

---

## 0. 구조 결정 근거

| 항목 | 내용 |
|------|------|
| 프론트 분리 허용 여부 | 허용. mission §3 "라우팅, 요청/응답, **템플릿 또는 프론트 연동**", §4-1 "형태 자유" |
| 필수 제약 | 백엔드 Python + FastAPI, DB SQLite 권장 (§5) |
| plan.md 영향 | Jinja2 템플릿(Step 6), 디렉토리 구조, 의존성 목록 수정 필요 |
| 인증 방식 | **JWT Bearer (PyJWT, HS256)** — 근거: docs/02-architecture.md §4 |
| AI API | **Codyssey AI API (COPA)** — docs/02-architecture.md §6 |
| 입력 검증 실패 코드 | **400 `INVALID_INPUT`** 으로 통일 |
| PoC 구현 대조 | docs/08-checklist.md §2 |
| 관리자 기능 | **채택** — mission §2-2 "관리자/내부 로그 확인 화면"(47줄), §4-4 "관리자 조회 API/화면"(92줄) 선택지. `role=admin` 은 `.env` 시드로만, 조회 전용 (B15, F10) |
| 배포 방식 | 동일 도메인 — Nginx가 `/` → React 빌드, `/api` → uvicorn |

---

## 1. Backend (FastAPI)

| # | 기능 | 세부 | mission 근거 |
|---|------|------|--------------|
| B1 | 앱 기본 구성 | 설정 로딩(`.env`), SQLite 연결, `GET /api/health`, CORS(개발용) | §5, §6 |
| B2 | DB 모델 | `users`, `chat_logs` (아래 3절) | §4-4 |
| B3 | 회원가입 API | `POST /api/auth/signup` — username 중복 체크, bcrypt 해시 저장 | §4-2 |
| B4 | 로그인/로그아웃 API | `POST /api/auth/login`, `POST /api/auth/logout` — 인증 정보 발급/폐기 | §4-2 |
| B5 | 현재 사용자 API | `GET /api/auth/me` — 프론트 로그인 상태 확인용 | §4-2 |
| B6 | 접근 제어 | `get_current_user` 의존성, 비로그인 시 `/api/chat`, `/api/me/chats` → 401 | §4-2 |
| B7 | 챗 API | `POST /api/chat` — 수신 → 검증 → 컨텍스트 구성 → AI 호출 → DB 저장 → JSON 응답 | §4-3 |
| B8 | AI 클라이언트 | httpx, API 키 서버 환경변수 전용, 타임아웃 설정 | §4-3, §6 |
| B9 | 실패 처리 | 타임아웃 → `AI_TIMEOUT` / 기타 → `AI_ERROR`, 503 + `{error, message}`, 서버 유지 | §4-5, §6 |
| B10 | 컨텍스트 유지 | 동일 사용자 최근 N턴(`CONTEXT_TURNS`) Q/A를 messages에 포함 | §4-3 |
| B11 | 입력 검증 | 빈 입력/공백 차단, 최대 길이 제한 → 400(또는 422, 팀 통일) | §4-5 |
| B12 | 내 로그 조회 API | `GET /api/me/chats` — 세션 사용자 기준으로만 조회 | §4-4, §2-2 |
| B13 | 서버 로그 | 4개 이벤트 필수 기록 (아래 4절) | §4-5, §6 |
| B14 | 확인용 SQL | `scripts/check_logs.sql` — 최근 대화 로그 조회 | §2-2 |
| B15 | 관리자 조회 API | `users.role`, `require_admin`(403), `GET /api/admin/stats·users·users/{id}/chats`, `.env` 관리자 시드, 감사 로그 | §2-2, §4-4 |

---

## 2. Frontend (React)

| # | 기능 | 세부 | mission 근거 |
|---|------|------|--------------|
| F1 | 프로젝트 구성 | Vite + React Router, API base URL 환경변수(키 없음), 개발 시 `/api` proxy | §4-1 |
| F2 | 회원가입 페이지 | 폼, 성공 시 로그인 페이지 이동, 실패 메시지 표시 | §4-2 |
| F3 | 로그인 페이지 | 폼, 성공 시 챗 페이지 이동, 실패 메시지 표시 | §4-2 |
| F4 | 인증 상태 관리 | 앱 로드 시 `/api/auth/me`, 헤더 로그인/로그아웃 표시, 로그아웃 버튼 | §4-2 |
| F5 | 보호 라우트 | 비로그인 `/chat` 접근 → `/login` 리다이렉트, API 401 수신 시 로그인 이동 | §4-2 |
| F6 | 챗 화면 | 입력창 + 전송, 같은 화면에 질문/응답 말풍선 누적, 응답 대기 로딩 표시 | §4-1 |
| F7 | 오류 안내 | 503(`AI_TIMEOUT`/`AI_ERROR`), 400/422 수신 시 채팅창에 안내 메시지 | §4-5 |
| F8 | 클라이언트 입력 검증 | 빈 입력 전송 버튼 비활성, 글자 수 제한 (서버 검증 보조) | §4-5 |
| F9 | (선택) 이전 대화 로드 | 챗 진입 시 `/api/me/chats`로 기존 대화 표시 — 필수 조회 수단은 B12로 충족 | §4-4 |
| F10 | 관리자 화면 | `/admin`: 통계, 사용자 목록·검색, 사용자별 대화·상태 필터, `RequireAdmin` 가드, 관리자에게만 탭 표시 | §2-2, §4-4 |

---

## 3. DB 구조

### users

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 사용자 식별자 |
| username | TEXT UNIQUE | 로그인 ID |
| password_hash | TEXT | bcrypt 해시 |
| created_at | DATETIME | 가입 시각 |

### chat_logs

| 필드 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 로그 식별자 |
| user_id | INTEGER FK → users.id | 사용자 식별 (필수 추적 필드) |
| question | TEXT | 사용자 질문 (필수 추적 필드) |
| answer | TEXT | AI 응답 (필수 추적 필드) |
| created_at | DATETIME | 생성 시각 (필수 추적 필드) |

---

## 4. API 요약

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/health` | X | 헬스 체크 |
| POST | `/api/auth/signup` | X | 회원가입 |
| POST | `/api/auth/login` | X | 로그인 |
| POST | `/api/auth/logout` | O | 로그아웃 |
| GET | `/api/auth/me` | O | 현재 사용자 |
| POST | `/api/chat` | O | 질문 → AI 응답 |
| GET | `/api/me/chats` | O | 내 대화 로그 조회 |

### 오류 응답 형식

```json
{ "error": "AI_TIMEOUT", "message": "현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요." }
```

| 상황 | 상태코드 | error |
|------|----------|-------|
| 비로그인 | 401 | `UNAUTHORIZED` |
| 입력 검증 실패 | 400 / 422 | `INVALID_INPUT` |
| AI 타임아웃 | 503 | `AI_TIMEOUT` |
| AI 호출 실패 | 503 | `AI_ERROR` |

### 필수 서버 로그 이벤트

| 이벤트 | 예시 |
|--------|------|
| 요청 수신 | `request_received user_id=12 path=/api/chat` |
| AI 호출 | `ai_call_start user_id=12` |
| AI 응답/실패 | `ai_call_success latency_ms=1240` / `ai_call_failed error=AI_TIMEOUT` |
| DB 저장 | `db_save_success user_id=12 chat_id=987` / `db_save_failed ...` |

---

## 5. 공통 / 산출물

| # | 항목 | mission 근거 |
|---|------|--------------|
| C1 | 저장소 구조 `backend/`, `frontend/`, 각각 `.env.example`, 루트 `.gitignore`(`.env`, `node_modules`, `*.db`, `.venv`) | §6 |
| C2 | 배포 — 외부 네트워크 접속 가능한 단일 URL | §2-1, §4-6 |
| C3 | README — 개요 / 구조 / API 명세(예시) / DB 구조 / 실행(백·프론트) / 환경변수 / 팀 역할 / 민감정보 관리 | §2-2 |
| C4 | Git — `main`/`develop`/`feature/*`, PR merge, 팀원별 커밋 10회 이상, 문서-이력 일치 | §4-7 |

---

## 6. 역할 분담 (제안)

| 팀원 | 담당 기능 |
|------|-----------|
| 성원모 | B3~B6, F2~F5 (인증 풀스택) |
| 박성현 | B7~B11, B13, F6~F8 (챗 풀스택) |
| 이성준 | B1, B2, B12, B14, F1, F9, C1~C3 (기반·로그 조회·배포·문서) |

---

## 7. mission 대조 체크

| mission 요구사항 | 대응 기능 |
|------------------|-----------|
| §4-1 웹 UI (질문 입력, 같은 화면 응답) | F6 |
| §4-2 회원가입/로그인 | B3, B4, F2, F3 |
| §4-2 인증 상태별 기능 구분, 챗은 로그인 사용자만 | B5, B6, F4, F5 |
| §4-3 서버에서 AI 호출, 키 비노출 | B7, B8 |
| §4-3 컨텍스트 전략 | B10 |
| §4-4 질문/응답 누적 저장 (사용자·시각·질문·응답) | B2, B7 |
| §4-4 사용자 기준 조회/추적 | B12, B14 |
| §4-5 로그 4종 | B13 |
| §4-5 AI 실패/타임아웃 시 비정상 종료 방지 + 오류 안내 | B9, F7 |
| §4-5 입력 검증 1개 이상 | B11 (F8 보조) |
| §4-6 외부 접속 + 배포 문서 | C2, C3 |
| §4-7 브랜치/PR/커밋/역할 문서 | C4, 6절 |
| §6 민감정보 관리 | B8, C1, C3 |
