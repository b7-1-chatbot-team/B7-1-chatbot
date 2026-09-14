# 08. 평가 대응 체크리스트 · PoC 구현 대조표

범례: ✅ PoC 에서 구현·검증 완료 · 🟡 PoC 준비 완료, **팀이 실제 수행해야 완료** · ❌ 미구현

## 1. mission 요구사항 대조 (최종 검증)

### §2-1 최종 결과물 — 웹 기반 AI 챗봇 (FastAPI)
| 요구 | 상태 | 근거 (구현 / 검증) |
|------|:----:|--------------------|
| 로그인 상태에서 웹 페이지로 텍스트 질문 입력 | ✅ | `ChatPage.jsx` / B06·B07, E30 |
| 서버가 질문 수신 후 AI API 호출해 응답 생성 | ✅ | `routers/chat.py`, `ai_client.py` / V20, E30 |
| AI 응답이 웹 화면에 표시 | ✅ | 봇 말풍선 / B07 |
| 평가 시점 외부 네트워크에서 접속 가능한 URL | 🟡 | `deploy/`, docs/06 준비 완료 → **VM 배포 후 URL 기입 필요** |

### §2-2 프로젝트 산출물
| 요구 | 상태 | 위치 |
|------|:----:|------|
| GitHub Repository 링크 | 🟡 | 저장소 생성 후 README 기입 |
| 프로젝트 개요(문제·타겟·시나리오) | ✅ | docs/01-scenario.md, README |
| 시스템 구조(아키텍처·컴포넌트 역할) | ✅ | docs/02-architecture.md |
| API 명세(요청/응답 예시) | ✅ | docs/03-api.md, Swagger `/docs` |
| DB 구조(ERD·필드 설명) | ✅ | docs/04-database.md |
| 배포/실행 방법(환경 변수 포함) | ✅ | docs/06-deployment.md |
| 팀 구성원 역할 및 개인별 작업 요약 | 🟡 | docs/09-team.md 계획 작성 → **실제 작업 후 커밋 수와 함께 갱신** |
| 민감정보 관리(.env 예시, .gitignore) | ✅ | `backend/.env.example`, `frontend/.env.example`, `.gitignore` |
| DB 확인 가이드 (1개 이상) | ✅ | **선택지 3종 모두 제공**: ① 로그 조회 API(`/api/me/chats`, `/api/admin/*`) ② **관리자/내부 로그 확인 화면**(`/admin`) + 내 대화 로그 화면 ③ `scripts/check_logs.sql` |

### §4-1 웹 UI
| 요구 | 상태 | 근거 |
|------|:----:|------|
| 질문 입력 웹 페이지 존재 | ✅ | `/chat` |
| 질문 후 응답을 같은 화면에서 확인 | ✅ | 단일 페이지 말풍선 누적 (fetch, 페이지 전환 없음) |

### §4-2 사용자 인증 및 접근 제어
| 요구 | 상태 | 근거 |
|------|:----:|------|
| 회원가입 정상 동작 | ✅ | V11, E20·E21 |
| 로그인 정상 동작 | ✅ | V10·V12, E22·E23 |
| 인증 상태에 따라 기능 구분 | ✅ | 헤더 메뉴 분기, `RequireAuth`/`GuestOnly`, B01 |
| 챗봇 질문/응답은 로그인 사용자만 | ✅ | `Depends(get_current_user)` / V13, E10·E11 |

### §4-3 AI 챗봇 처리
| 요구 | 상태 | 근거 |
|------|:----:|------|
| 서버가 질문 수신 → AI API 호출 → 응답 생성 | ✅ | V20 |
| AI 호출은 서버에서만, 결과만 반환 (키 노출 방지) | ✅ | 키는 `backend/.env` 만, `/api/config` 에 키 없음(V02), 프론트 번들에 키 없음 |
| 최소한의 컨텍스트 전략 | ✅ | 같은 사용자 최근 5개 성공 Q/A / V21·V22, E31 |

### §4-4 대화 로그 저장 및 조회/추적
| 요구 | 상태 | 근거 |
|------|:----:|------|
| 질문과 AI 응답 DB 누적 저장 | ✅ | `chat_logs` / V20, L4-3 |
| 최소 추적 필드: 사용자 식별·생성 시각·질문·응답 | ✅ | `user_id, created_at, question, answer` |
| 사용자 기준 로그 조회/추적 | ✅ | 예시 3종 모두: 내 로그 API/화면(V50, E60~E63) · **관리자 조회 API/화면**(V80~V91, B24~B26, E80~E83) · SQL(`WHERE u.username=…`) |

### §4-5 운영 및 유지보수
| 요구 | 상태 | 근거 |
|------|:----:|------|
| 로그: 요청 수신 | ✅ | `request_received`, `chat_request` |
| 로그: AI 호출 | ✅ | `ai_call_start` |
| 로그: AI 응답 수신 또는 실패 | ✅ | `ai_call_success` / `ai_call_failed error= detail=` |
| 로그: DB 저장 성공·실패 | ✅ | `db_save_success` / `db_save_failed` (V61 강제 실패 검증) |
| AI 실패/타임아웃 시 비정상 종료 없음 | ✅ | V40·V41, E52·E53 |
| 사용자에게 오류 알림(메시지/상태코드/안내) | ✅ | 503 + `{error, message}` + 주황 말풍선 |
| 입력 검증 1개 이상 | ✅ | 빈 입력, 공백, 1000자 제한, 아이디/비번 형식 — 서버·클라이언트 이중 / V30·V31 |

### §4-6 배포 및 접근성
| 요구 | 상태 | 근거 |
|------|:----:|------|
| 외부 네트워크 접속 가능 | 🟡 | 배포 구성은 로컬 Nginx+HTTPS 로 재현·검증 완료(docs/07 §4, E2E 24/24·UI 39/39) → **실제 VM 배포 후 외부망에서 동일 테스트** |
| 배포/실행 방법·환경 변수 문서화 | ✅ | docs/06 |

### §4-7 협업 및 형상관리 (팀 수행 항목)
| 요구 | 상태 | 수행 방법 |
|------|:----:|-----------|
| 브랜치 전략 (main/develop) | 🟡 | 규칙 확정: `main`/`develop` + `feature/*`(develop 분기) + `hotfix/*`(main 분기) — docs/09 §2 |
| 기능 단위 작업 브랜치 흔적 | 🟡 | 브랜치 이름 규칙 `type/kebab-case` 와 팀원별 이슈·브랜치 계획 (docs/09 §2-2, §4) |
| PR 기반 Merge 기록 | 🟡 | PR 가이드·템플릿(docs/10, `.github/pull_request_template.md`), Merge commit 방식, main/develop 보호 규칙 |
| 팀원별 유의미한 커밋 10회 이상 | 🟡 | 팀원별 커밋 계획 12~14회 (docs/09 §4) |
| 문서의 역할 기술이 Git 이력과 일치 | 🟡 | 마감 시 `git shortlog -sn` 결과로 docs/09 갱신 |

### §5 개발 환경 / §6 제약 사항
| 요구 | 상태 | 근거 |
|------|:----:|------|
| Python & FastAPI | ✅ | backend |
| SQLite, 평가자가 연결/조회 가능 | ✅ | `backend/app.db` + check_logs.sql |
| 민감정보 코드/문서에 직접 작성 금지 | ✅ | 키·비밀번호는 `.env`. (테스트 코드의 데모 비밀번호는 격리된 임시 DB 전용 픽스처) |
| 모든 민감정보 환경 변수 관리 | ✅ | `config.py` |
| `.env` 저장소 업로드 방지 | ✅ | 루트 `.gitignore` |
| README 에 환경 변수 키 목록·설정 방법 | ✅ | README §5, docs/06 §2 |
| AI 호출 타임아웃 설정 + 실패 시 오류 안내 | ✅ | `AI_TIMEOUT=15` / V40 |
| 요청·AI 호출/응답·DB 저장 성공/실패 로그 | ✅ | V60·V61 |
| PR 머지, 커밋 10회, 역할 문서 | 🟡 | §4-7 과 동일 |

### 요약
| 구분 | ✅ | 🟡 (팀 수행 필요) | ❌ |
|------|:--:|:--:|:--:|
| 기능 요구 (§4-1 ~ §4-5, 관리자 조회 선택지 포함) | 19 | 0 | 0 |
| 결과물·산출물·배포·협업·제약 (§2, §4-6, §4-7, §5, §6) | 19 | 10 | 0 |

**남은 🟡 는 모두 코드가 아니라 "배포 실행 / GitHub 협업 이력 / 문서 기입"** 이다.

---

## 2. PoC 구현 리스트 대조 (features.md 기준)

### Backend
| # | 기능 | 상태 | 구현 위치 | 검증 |
|---|------|:----:|-----------|------|
| B1 | 앱 기본 구성 (설정·SQLite·health·CORS) | ✅ | `main.py`, `config.py`, `database.py`, `routers/system.py` | V01 |
| B2 | DB 모델 users / chat_logs (+sessions) | ✅ | `models.py` | L4-3, docs/04 |
| B3 | 회원가입 API | ✅ | `routers/auth.py` | V11 |
| B4 | 로그인/로그아웃 API | ✅ | `routers/auth.py` | V10·V12·V14 |
| B5 | 현재 사용자 API | ✅ | `GET /api/auth/me` | V13 |
| B6 | 접근 제어 | ✅ | `deps.py` | V13 |
| B7 | 챗 API 파이프라인 | ✅ | `routers/chat.py` | V20 |
| B8 | AI 클라이언트 (서버 전용 키, 타임아웃) | ✅ | `ai_client.py` | V40 |
| B9 | 실패 처리 (AI_TIMEOUT/AI_ERROR 503) | ✅ | `ai_client.py`, `errors.py` | V40·V41 |
| B10 | 컨텍스트 유지 (최근 N턴) | ✅ | `build_context()` | V21·V22 |
| B11 | 입력 검증 → 400 통일 | ✅ | `chat.py`, `schemas.py`, `errors.py` | V30·V31 |
| B12 | 내 로그 조회 API | ✅ | `routers/me.py` | V50 |
| B13 | 서버 로그 4종 | ✅ | `logging_config.py` | V60·V61 |
| B14 | 확인용 SQL | ✅ | `scripts/check_logs.sql` | L4-3 |
| + | 사용자별 서버 로그 API (디자인 패널) | ✅ | `GET /api/me/server-logs` | V51 |
| B15 | 관리자 조회 API (역할·시드·마이그레이션·감사 로그) | ✅ | `routers/admin.py`, `deps.require_admin`, `main.seed_admin_user`, `database.migrate_schema` | V80~V91, E80~E83 |
| + | CSRF Origin 검사, request_id | ✅ | `main.py` 미들웨어 | V15 |

### Frontend
| # | 기능 | 상태 | 구현 위치 | 검증 |
|---|------|:----:|-----------|------|
| F1 | Vite + Router + /api 프록시 | ✅ | `vite.config.js`, `main.jsx` | E01 |
| F2 | 회원가입 페이지 | ✅ | `pages/AuthPage.jsx` | B03·B04 |
| F3 | 로그인 페이지 | ✅ | `pages/AuthPage.jsx` | B02·B05·B06 |
| F4 | 인증 상태 관리 | ✅ | `auth.jsx`, `Header.jsx` | B06·B15 |
| F5 | 보호 라우트 | ✅ | `App.jsx` | B01·B18 |
| F6 | 챗 화면 | ✅ | `pages/ChatPage.jsx` | B07·B08 |
| F7 | 오류 안내 | ✅ | 오류 말풍선, 폼 알림 | B12·B13·B20 |
| F8 | 클라이언트 입력 검증 | ✅ | 전송 비활성, 글자수 제한, 폼 검증 | B02·B10·B11 |
| F9 | 이전 대화 로드 | ✅ | `ChatPage` 진입 시 복원 | B15 |
| + | 내 대화 로그 화면 | ✅ | `pages/LogsPage.jsx` | B16·B17 |
| + | 응답 시뮬레이션 / 서버 로그 패널 (디자인 반영) | ✅ | `ChatPage.jsx` | B12·B13 |
| F10 | 관리자 화면 (통계·사용자 목록·검색·사용자별 대화·필터·URL 유지) + 가드 | ✅ | `pages/AdminPage.jsx`, `components/LogCard.jsx`, `App.jsx RequireAdmin` | B24~B26 |

### 공통
| # | 항목 | 상태 | 위치 |
|---|------|:----:|------|
| C1 | 저장소 구조, `.env.example` ×2, `.gitignore` | ✅ | 루트 |
| C2 | 배포 구성 (Nginx·systemd·deploy.sh) | ✅ 준비 / 🟡 실행 | `deploy/` |
| C3 | README + 기술 문서 | ✅ | `README.md`, `docs/01~09` |
| C4 | Git 브랜치/PR/커밋 | 🟡 | docs/09 규칙대로 팀 진행 |

---

## 3. 평가 당일 체크리스트

- [ ] 서비스 URL 이 **휴대폰 데이터망**에서 열린다
- [ ] `https://<도메인>/api/health` → 200
- [ ] 외부망에서 `BASE=https://<도메인> bash backend/scripts/e2e_flow.sh` → FAIL=0
- [ ] 데모 계정(`tester`) 로그인 가능, `DEMO_MODE=true` (시뮬레이션 패널 표시)
- [ ] 관리자 계정 로그인 → "관리자" 탭 → 사용자 선택 → 대화 조회 시연 준비 (`ADMIN_PASSWORD` 설정)
- [ ] 실제 Claude 응답 확인 (`app_started ai_provider=anthropic`)
- [ ] 서버에서 `tail -f backend/logs/app.log` 시연 준비
- [ ] `sqlite3 backend/app.db < backend/scripts/check_logs.sql` 시연 준비
- [ ] `git log --merges --oneline` 에 PR 머지 기록
- [ ] `git shortlog -sn` 팀원 3명 모두 10 이상, README 역할표와 일치
- [ ] `git ls-files | grep -E '(^|/)\.env$'` 출력 없음
- [ ] README 서비스 URL / Repository 링크 기입
