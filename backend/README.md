# Chatlog — 웹 기반 AI 챗봇 서비스

로그인한 사용자의 질문에 AI 가 답하고, 모든 질문/응답을 사용자 기준으로 저장·조회하는 웹 챗봇.
AI 장애(타임아웃/오류)에도 서비스는 유지되고 사용자에게 원인을 안내한다.

**서비스 URL:** _(배포 후 기입)_
**GitHub Repository:** _(기입)_
**팀:** 성원모 · 박성현 · 이성준

| 영역 | 스택 |
|------|------|
| Backend | Python · **FastAPI** · SQLAlchemy · **SQLite** · bcrypt · Anthropic Claude API |
| Frontend | **React** 19 · Vite · React Router |
| 인증 | 서버 측 세션 + HttpOnly·SameSite 쿠키 |
| 배포 | Ubuntu VM · Nginx · systemd · certbot(HTTPS) |

## 문서

| 문서 | 내용 |
|------|------|
| [docs/01-scenario.md](docs/01-scenario.md) | 문제 정의 · 타겟 사용자 · 핵심 시나리오 · 유저 플로우 |
| [docs/02-architecture.md](docs/02-architecture.md) | 아키텍처 · 컴포넌트 역할 · 내부 처리 절차(시퀀스) · **세션 vs JWT 결정 근거** |
| [docs/03-api.md](docs/03-api.md) | API 명세 (요청/응답 예시) |
| [docs/04-database.md](docs/04-database.md) | ERD · 테이블/필드 · DB 확인 가이드 |
| [docs/05-ui-ux.md](docs/05-ui-ux.md) | 디자인 시스템 · 화면별 상호작용 |
| [docs/06-deployment.md](docs/06-deployment.md) | 로컬 실행 · 환경 변수 · 운영 배포 · 트러블슈팅 |
| [docs/07-verification.md](docs/07-verification.md) | 검증 절차(pytest · E2E · 브라우저 · 데이터) 와 결과 |
| [docs/08-checklist.md](docs/08-checklist.md) | 평가 요구사항 체크리스트 · PoC 구현 대조표 |
| [docs/09-team.md](docs/09-team.md) | 팀 필수 규칙 · **브랜치 전략 · 커밋 컨벤션** · 역할 분담 · 브랜치/커밋 계획 |
| [docs/10-pull-request.md](docs/10-pull-request.md) | PR 규칙 · 본문 템플릿(`.github/pull_request_template.md`) · 작성 예시 |
| [features.md](features.md) | 기능 리스트 |

---

## 1. 프로젝트 개요

- **문제 정의**: 일반 챗봇은 대화 기록이 계정 단위로 남지 않고, 장애 시 이유를 알 수 없으며, 과거 질문을 추적하기 어렵다.
- **타겟 사용자**: 개발 학습자(질문을 이어가며 학습), 관리자/평가자(전체 사용자별 대화 추적), 개발팀(서버 로그·SQL 로 장애 추적).
- **핵심 시나리오**: 가입 → 로그인 → "배포 방법 알려줘" → "내가 방금 뭘 물어봤지?"(문맥 유지) → AI 타임아웃 시 안내 → "내 대화 로그"에서 기록 확인 → 로그아웃. 관리자는 "관리자" 화면에서 사용자 목록 → 사용자별 대화를 추적.

## 2. 시스템 구조

```
Browser (React SPA)
   │  HTTPS  /        → 정적 파일
   │  HTTPS  /api/*   (세션 쿠키)
   ▼
Nginx ──proxy──► FastAPI (uvicorn)
                  ├─ middleware : request_id · Origin 검사 · 요청 로그
                  ├─ auth  : signup / login / logout / me   ── bcrypt, sessions
                  ├─ chat  : 검증 → 컨텍스트(최근 5턴) → AI 호출(timeout) → 저장
                  ├─ me    : 내 대화 로그 / 내 서버 로그
                  ├─ admin : 통계 / 사용자 목록 / 사용자별 대화  (role=admin)
                  └─ system: health / config
                        │                     │
                        ▼                     ▼
                  SQLite app.db         Claude API (키는 서버에만)
                  users·sessions·chat_logs
                        │
                  logs/app.log
```
컴포넌트별 역할과 시퀀스 다이어그램: [docs/02-architecture.md](docs/02-architecture.md)

## 3. API 명세 (요약)

| Method | Path | 인증 | 설명 |
|--------|------|:----:|------|
| GET | `/api/health` | – | 서버·DB 상태 |
| GET | `/api/config` | – | 공개 설정 |
| POST | `/api/auth/signup` | – | 회원가입 (201 / 409 / 400) |
| POST | `/api/auth/login` | – | 로그인, 세션 쿠키 발급 (200 / 401) |
| POST | `/api/auth/logout` | – | 세션 삭제 (204) |
| GET | `/api/auth/me` | ✅ | 현재 사용자 |
| POST | `/api/chat` | ✅ | 질문 → AI 응답 (200 / 400 / 401 / 503) |
| GET | `/api/me/chats` | ✅ | 내 대화 로그 |
| GET | `/api/me/server-logs` | ✅ | 내 요청의 서버 로그 |
| GET | `/api/admin/stats` | 🔒 | 전체 통계 (admin) |
| GET | `/api/admin/users` | 🔒 | 사용자 목록·검색 (admin) |
| GET | `/api/admin/users/{id}/chats` | 🔒 | 사용자별 대화 (admin) |

```bash
curl -c cookie.txt -X POST localhost:8000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"tester","password":"<DEMO_PASSWORD>"}'
curl -b cookie.txt -X POST localhost:8000/api/chat -H 'Content-Type: application/json' \
  -d '{"message":"배포 방법 알려줘"}'
# 200 {"chat_id":1,"answer":"...","latency_ms":402,"context_turns":0,"saved":true,"request_id":"5d14c34e071f",...}
# 503 {"error":"AI_TIMEOUT","message":"현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.","request_id":"..."}
```
전체 예시: [docs/03-api.md](docs/03-api.md)

## 4. DB 구조

| 테이블 | 필드 |
|--------|------|
| `users` | id PK · username UNIQUE · password_hash(bcrypt) · role(user/admin) · created_at |
| `sessions` | id PK · token_hash(SHA-256) UNIQUE · user_id FK · created_at · expires_at |
| `chat_logs` | id PK · **user_id** FK · **question** · **answer** · status · error_code · latency_ms · request_id · **created_at** |

**DB 확인 방법** (mission 선택지 3종 모두 제공)
1. API: `GET /api/me/chats` · 관리자 `GET /api/admin/users`, `GET /api/admin/users/{id}/chats`
2. 화면: "내 대화 로그" · **관리자 계정 → "관리자" 탭 (사용자 목록 → 사용자별 대화)**
3. SQL: `sqlite3 backend/app.db < backend/scripts/check_logs.sql`

ERD·`.schema` 출력: [docs/04-database.md](docs/04-database.md)

## 5. 실행 / 배포 방법

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                     # 값 입력 (아래 표)
uvicorn app.main:app --reload --port 8000

# Frontend (새 터미널)
cd frontend
npm install
npm run dev                              # http://127.0.0.1:5173

# 테스트 (결과: docs/07-verification.md)
cd backend && python -m pytest -q                                                                  # 42 passed
BASE=http://127.0.0.1:5173 DEMO_PASSWORD=<값> ADMIN_PASSWORD=<값> bash backend/scripts/e2e_flow.sh  # PASS=28 FAIL=0

# 브라우저 UI 테스트 (Chromium · Firefox · WebKit)
python3 -m venv e2e/.venv && e2e/.venv/bin/pip install -r e2e/requirements.txt
e2e/.venv/bin/playwright install chromium firefox webkit
BASE=http://127.0.0.1:5173 DEMO_PASSWORD=<값> ADMIN_PASSWORD=<값> e2e/.venv/bin/python -m pytest e2e -v   # 48 passed
```

### 환경 변수 (`backend/.env`, 키 이름만)

| 키 | 설명 |
|----|------|
| `ANTHROPIC_API_KEY` | Claude API 키 (서버 전용, 비우면 mock 응답) |
| `AI_PROVIDER` | `auto` / `anthropic` / `mock` |
| `AI_MODEL` | 사용 모델 (기본 `claude-opus-5`) |
| `AI_EFFORT` | 응답 깊이 (기본 `low`) |
| `AI_MAX_TOKENS` | 응답 최대 토큰 |
| `AI_TIMEOUT` | AI 호출 제한 시간(초) |
| `CONTEXT_TURNS` | 컨텍스트로 보낼 이전 Q/A 수 |
| `MAX_MESSAGE_LENGTH` | 질문 최대 글자수 |
| `DEMO_MODE` | 응답 시뮬레이션 허용 |
| `DATABASE_URL` | SQLite 경로 |
| `SESSION_TTL_HOURS` | 세션 유효 시간 |
| `SESSION_COOKIE_SECURE` | HTTPS 운영 시 `true` |
| `ALLOWED_ORIGINS` | 허용 Origin |
| `DEMO_USERNAME` / `DEMO_PASSWORD` | 시작 시 생성할 데모 계정 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 시작 시 생성(또는 승격)할 관리자 계정 |

운영 배포(Nginx·systemd·HTTPS): [docs/06-deployment.md](docs/06-deployment.md)

## 6. 팀 구성원 역할 및 개인별 작업 요약

| 팀원 | 역할 | 주요 작업 | 커밋 수 |
|------|------|-----------|---------|
| 성원모 | 인증·보안·권한 | 회원가입/로그인/세션, 접근 제어, CSRF, 관리자 권한·API, 인증 화면·라우트 가드, 인증·관리자 테스트 | _ |
| 박성현 | 챗봇 파이프라인 | AI 연동·타임아웃·예외, 컨텍스트, 입력 검증, 서버 로그, 챗 화면, 챗 테스트 | _ |
| 이성준 | 기반·데이터·배포·문서 | 프로젝트 골격, DB 모델·마이그레이션, 로그 조회 API/화면, 관리자 화면, 디자인 시스템, 배포, E2E, 문서 | _ |

**`git shortlog -sn` 출력**
```
(마감 시 붙여넣기)
```
규칙·브랜치·커밋 계획: [docs/09-team.md](docs/09-team.md)

## 7. 민감정보 관리

- [ ] `.env` 가 `.gitignore` 에 포함 (`.env`, `.env.*`, `!.env.example`)
- [ ] `backend/.env.example`, `frontend/.env.example` 제공 (값 없음)
- [ ] API 키는 서버 환경 변수로만 사용, 응답·프론트 번들에 미포함
- [ ] 비밀번호 bcrypt, 세션 토큰 SHA-256 해시로만 DB 저장
- [ ] 서버 로그에 질문 원문·비밀번호 미기록

```bash
git ls-files | grep -E '(^|/)\.env$'     # (출력 없음)
grep -rn "sk-ant" --exclude-dir={node_modules,.venv,dist} .   # (출력 없음)
```

---

# 진행 체크리스트

상세 근거와 검증 ID: [docs/08-checklist.md](docs/08-checklist.md)

## Step 0. 팀 세팅
- [x] GitHub Repository 생성
- [ ] `main` / `develop` 브랜치 분리 + 보호 규칙
- [ ] 역할 분담 계획 (docs/09)

## Step 1. 환경 구성
- [ ] 가상환경 + requirements.txt
- [ ] `.env.example`, `.gitignore` 작성
- [ ] FastAPI 앱 기동 확인 — `{"status":"ok","db":"ok"}`

## Step 2. DB 설계
- [ ] `users` 테이블 생성
- [ ] `chat_logs` 테이블 생성 (사용자 식별 / 생성 시각 / 질문 / 응답 포함)

## Step 3. 인증 및 접근 제어
- [ ] 회원가입 정상 동작 (V11, E20)
- [ ] 로그인 정상 동작 (V10, E23)
- [ ] 비밀번호 해시 저장 확인 (`$2b$12$`, 60자)
- [ ] 비로그인 시 챗 기능 차단 확인 (V13, E10, B01)
- [ ] 로그인 시 챗 기능 접근 확인 (V20, E30)

## Step 4. AI API 연동
- [ ] 서버에서 AI API 호출 (키 클라이언트 미노출)
- [ ] 타임아웃 설정 적용 (`AI_TIMEOUT`)
- [ ] 타임아웃 발생 시 서버 정상 유지 + 오류 안내 반환 (V40, E52·E53)
- [ ] API 오류 시 오류 안내 반환 (V41, E50)
- [ ] 실제 Claude API 키로 동일 검증 (docs/07 §5)

## Step 5. 챗 파이프라인 및 입력 검증
- [ ] 질문 수신 → AI 호출 → 응답 반환 → DB 저장 파이프라인 동작
- [ ] 컨텍스트 유지 전략 적용 (방식: 같은 사용자의 최근 5개 성공 Q/A 를 messages 앞에 배치)
- [ ] 입력 검증 (빈 입력·공백 / 1000자 제한 / 아이디·비밀번호 형식)

## Step 6. 웹 UI
- [ ] 질문 입력 페이지 존재
- [ ] 같은 화면에서 응답 확인 가능
- [ ] 오류 안내 표시
- [ ] 화면 캡처 첨부 (`docs/screenshots/`, Playwright 자동 캡처)
- [ ] Chromium · Firefox · WebKit · 모바일 폭 UI 검증 (48/48, 관리자 화면 포함)

## Step 7. 로그 저장 및 조회
- [ ] 질문/응답 DB 누적 저장 확인
- [ ] 사용자 기준 조회 수단 제공 (API / 화면 / SQL 3종)
- [ ] 타 사용자 로그 미노출 확인 (V50, E63)
- [ ] 관리자 조회 API/화면: 사용자 목록 → 사용자별 대화 (V80~V91, E80~E83, B24~B26)
- [ ] 일반 사용자 관리자 기능 차단 (403, `/admin` → `/chat`)

## Step 8. 서버 로그
- [ ] 요청 수신 로그
- [ ] AI 호출 로그
- [ ] AI 응답 수신 / 실패 로그
- [ ] DB 저장 성공 / 실패 로그 (V61)

## Step 9. 배포
- [ ] 외부 네트워크에서 접속 가능
- [ ] 전체 시나리오(가입→로그인→질문→응답) 외부망 재현
- [ ] 배포/실행 방법 문서화
- [ ] 환경 변수 설정 방법 문서화

## Step 10. 협업 및 형상관리
- [ ] 브랜치 전략 적용
- [ ] 기능 단위 브랜치 흔적
- [ ] PR 기반 Merge 기록
- [ ] 팀원별 유의미한 커밋 10회 이상
- [ ] 문서의 역할 기술이 Git 이력과 일치
