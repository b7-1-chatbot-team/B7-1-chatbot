# HANDOFF — Chatlog (웹 기반 AI 챗봇) 작업 컨텍스트

> 새 세션은 이 파일을 먼저 읽고 이어서 작업한다. 작성 기준일 2026-09-14.
> 경로: `/Users/jun/Documents/GitHub/codyssey-work/chatbot` (아직 git init 안 됨, GitHub 저장소는 사용자가 생성함)

## 0. 사용자 선호 / 작업 방식

- 한국어로 대화. 결론·표 위주, 근거(파일:줄) 제시 선호
- 미션 문서 `mission.md` 가 최우선 기준. **필수만 구현, 보너스 없음** — 단 미션에 "선택지"로 적힌 것은 사용자 결정에 따름
- 확인 안 된 것을 된 것처럼 말하지 말 것 (README 체크박스도 실제 진행 기준으로만 체크)
- 기존 문서가 있으면 새 파일보다 **기존 문서 수정** 선호
- 비밀번호·API 키는 문서/채팅에 쓰지 않음 (`.env` 에만)

## 1. 프로젝트 요약

- 팀 미션(성원모·박성현·이성준): 로그인 사용자가 질문 → FastAPI 가 AI API 호출 → 응답 표시 → 대화 로그 DB 저장·사용자 기준 조회. 외부 접속 URL, README/문서, PR·브랜치·팀원별 커밋 10회 필요
- 스택: **FastAPI + SQLite(SQLAlchemy) / React 19 + Vite + React Router / 서버 측 세션(HttpOnly·SameSite 쿠키) / Anthropic Python SDK(`claude-opus-5`, 키 없으면 mock)**
- 배포 방향(논의 중, 미실행): **Railway 1프로젝트·서비스 2개** — `api`(Root `/backend`, Volume `/data`, 공개 도메인 없음) + `web`(Root `/frontend`, Railpack 빌드, `frontend/Caddyfile` 이 `/api/*` 를 `http://api.railway.internal:8000` 로 reverse_proxy). 기존 VM+Nginx 설계(`deploy/`)는 대안 (§8 참고)
- 디자인: `docs/design/*.html` — 다크 톤 `#0e1113`, 청록 `oklch(0.72 0.07 186)`, IBM Plex Sans KR / IBM Plex Mono

## 2. 확정된 결정

| 항목           | 결정                                                                                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 인증           | 서버 측 세션(DB `sessions`, 토큰 SHA-256 저장) + HttpOnly·SameSite=Lax 쿠키. JWT 대비 즉시 무효화·XSS 탈취 불가·단일 서버라 무상태 이점 불필요 (docs/02 §4)                                                 |
| CSRF           | SameSite=Lax + POST Origin 검사(403) + JSON 본문만                                                                                                                                                          |
| 입력 검증 실패 | 400 `INVALID_INPUT` 통일 (질문 1~1000자, 공백 차단, 아이디 `^[A-Za-z0-9_]{3,30}$`, 비번 4~72)                                                                                                               |
| AI 실패        | 503 `AI_TIMEOUT` / `AI_ERROR` + 안내 문구, 실패도 chat_logs 에 status=error 저장(컨텍스트 제외)                                                                                                             |
| 컨텍스트       | 같은 사용자 최근 5개 성공 Q/A                                                                                                                                                                               |
| 관리자         | **채택** (mission §2-2 47줄 "관리자/내부 로그 확인 화면", §4-4 92줄 "관리자 조회 API/화면" 선택지). `users.role`, `.env` 시드(`ADMIN_USERNAME`/`ADMIN_PASSWORD`)로만 생성, 조회 전용, 감사 로그             |
| 브랜치         | `main`/`develop`(직접 push 금지). 일반 작업 `feature/*`·`refactor/*`·`fix/*`·`docs/*`·`chore/*`·`test/*` 는 develop 분기→develop PR. `hotfix/*` 는 main 분기→main PR→develop 역반영. 이름 `type/kebab-case` |
| 커밋           | `type: 제목 #1` (이슈번호 앞자리 0 없음 확정). 타입 8개: feat, fix, hotfix, refactor, docs, test, style, chore (디자인·파일명변경·삭제는 refactor)                                                          |
| PR 머지        | **Merge commit 확정** (Squash·Rebase 금지 — 팀원별 커밋 수 보존)                                                                                                                                            |

## 3. 구현 현황 (PoC 완료, mock AI 기준)

**Backend `backend/app/`**: `main.py`(lifespan: 로깅·init_db·데모/관리자 시드, request_id·Origin 미들웨어) · `config.py` · `database.py`(`migrate_schema`: role 컬럼 자동 추가) · `models.py`(User[role], AuthSession, ChatLog[status,error_code,latency_ms,request_id]) · `security.py`(bcrypt) · `deps.py`(`get_current_user`, `require_admin`) · `ai_client.py`(Anthropic/mock, `asyncio.wait_for` 총 타임아웃, DEMO_MODE `simulate`) · `errors.py` · `logging_config.py`(콘솔+`logs/app.log`+링버퍼) · `routers/`(auth, chat, me, admin, system)

**API**: `GET /api/health`, `/api/config` · `POST /api/auth/signup|login|logout`, `GET /api/auth/me` · `POST /api/chat` · `GET /api/me/chats`, `/api/me/server-logs` · `GET /api/admin/stats`, `/api/admin/users?q=`, `/api/admin/users/{id}/chats?status=`
**필수 로그 이벤트**: request_received · ai_call_start · ai_call_success/failed · db_save_success/failed (+ admin_list_users, admin_view_chats, admin_access_denied)

**Frontend `frontend/src/`**: `api.js`(ApiError, 401 전역 이벤트, 502/503/504 무본문→SERVER_UNREACHABLE) · `auth.jsx` · `App.jsx`(RequireAuth/GuestOnly/RequireAdmin) · `components/`(Header, Footer, LogCard) · `pages/`(AuthPage, ChatPage[응답 시뮬레이션·서버 로그 패널·이전 대화 복원·IME Enter 처리], LogsPage, AdminPage) · `styles.css`

**기타**: `backend/scripts/check_logs.sql`, `backend/scripts/e2e_flow.sh`(curl E2E), `e2e/`(Playwright), `deploy/`(nginx conf `$http_host`, systemd, deploy.sh), `.github/pull_request_template.md`, 루트 `.gitignore`, `backend/.env.example`, `frontend/.env.example`

## 4. 검증 결과 (docs/07-verification.md)

| 테스트                                              | 명령                                                                                           | 결과                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| pytest (test_api 20 · test_edge 10 · test_admin 12) | `cd backend && .venv/bin/python -m pytest -q`                                                  | 42/42                           |
| API E2E                                             | `BASE=http://127.0.0.1:5173 DEMO_PASSWORD=… ADMIN_PASSWORD=… bash backend/scripts/e2e_flow.sh` | 28/28                           |
| Playwright (Chromium·Firefox·WebKit, 모바일)        | `BASE=… DEMO_PASSWORD=… ADMIN_PASSWORD=… e2e/.venv/bin/python -m pytest e2e`                   | 48/48                           |
| 로컬 Nginx HTTPS 운영 재현                          | 관리자 추가 **전** 기준                                                                        | E2E 24/24, UI 39/39, 설정 13/13 |

검증 중 고친 버그: 이전 대화 복원 응답이 새 메시지 덮어씀 · StrictMode 중복 복원 · 게이트웨이 오류 문구 · WARNING 줄바꿈 · 모바일 헤더 순서 · Nginx `$host` 포트 누락

**미검증**: 실제 Claude API(크레딧 필요, Pro 플랜과 API 결제는 별도) · 실제 VM 배포/외부망/systemd/certbot · 관리자 기능의 Nginx 환경 재검증 · 실제 한글 IME·실기기

## 5. 문서 지도

| 파일                    | 내용                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `mission.md`            | 원본 요구사항 (수정 금지)                                                                                |
| `features.md`           | 기능 명세 B1~B15, F1~F10, C1~C4 — **§3 DB·§4 API·§6 역할 부분은 최신화 필요**                            |
| `plan.md` / `theory.md` | 팀 실행 계획 / 이론 정리 (관리자·RBAC 반영됨)                                                            |
| `README.md`             | 제출용. 진행 체크리스트는 **"GitHub Repository 생성"만 체크**, 나머지 전부 미체크(사용자 지시)           |
| `docs/01~06`            | 시나리오 · 아키텍처(시퀀스, 세션 vs JWT) · API · DB · UI/UX · 배포/환경변수                              |
| `docs/07`               | 검증 절차·결과·발견 버그·미검증                                                                          |
| `docs/08`               | 평가 체크리스트 · PoC 구현 대조표 (✅/🟡 표시는 PoC 기준 — 실제 진행 기준으로 바꿀지 미정)               |
| `docs/09`               | 미션 필수 규칙 R1~R11 · 브랜치 전략 · 커밋 컨벤션 · 역할 분담 · 팀원별 이슈/브랜치/커밋 계획(각 14~18회) |
| `docs/10`               | PR 가이드(사용자 원본 틀 유지 + 보완)                                                                    |
| `docs/screenshots/`     | 01~09 캡처                                                                                               |

역할: 성원모 = 인증·보안·권한(관리자 API) / 박성현 = 챗 파이프라인·로그 / 이성준 = 기반·DB·로그 화면·관리자 화면·배포·문서

## 6. 로컬 실행

```bash
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev            # http://127.0.0.1:5173
```

- 계정: 데모 `tester`, 관리자 `admin` — 비밀번호는 `backend/.env` 의 `DEMO_PASSWORD`/`ADMIN_PASSWORD`
- DB `backend/app.db` 에 테스트가 만든 계정·대화가 섞여 있음 (초기화 요청 시 삭제 후 재시작)
- 백엔드 `--reload` 없이 켜면 코드 변경이 반영 안 됨 (한 번 겪음)

## 7. 남은 작업 / 열린 질문

1. `features.md` §3·§4·§6 최신화 여부
2. `docs/08` 상태 표시와 README §7 체크를 실제 진행 기준으로 맞출지
3. 실제 Claude API 검증 (키를 `backend/.env` 에 사용자가 직접 입력)
4. git init → develop 생성 → docs/09 §4 계획대로 팀원별 브랜치·PR 진행 (PoC 를 통째로 한 커밋에 올리면 미션 R2~R5 위반)
5. 배포 후 외부망 E2E·UI 테스트, README 서비스 URL·저장소 링크 기입
6. `features.md` 기능 목록 문서 위치 안내함 (루트). 커밋 타입 확정: design/rename/remove 없음 → refactor

## 8. 배포 논의 결과 (Railway, 아직 파일 추가·배포 안 함)

- **왜 프록시**: 프론트·백을 다른 도메인으로 두면 SameSite=Lax 세션 쿠키가 안 실리고 CORS·서드파티 쿠키 차단 문제 → 프론트 서비스가 `/api` 를 내부망으로 프록시하면 브라우저는 web 도메인 하나만 사용 → CORS 없음, 쿠키·Origin 검사 코드 변경 없음
- **프록시 규칙은 코드**(`frontend/Caddyfile`, 커밋), **Railway 콘솔은 값만**(web: Root Directory `/frontend`, 변수 `BACKEND_URL=http://api.railway.internal:8000`, Generate Domain)
  ```caddy
  :{$PORT} {
      handle /api/* { reverse_proxy {$BACKEND_URL} }
      handle { root * dist
               try_files {path} /index.html
               file_server }
  }
  ```
- **Docker 불필요**: Railway Railpack 이 Python/Node 자동 감지, 정적 사이트는 Caddy 로 서빙·루트 Caddyfile 로 덮어쓰기 가능(문서 확인). api Start Command `uvicorn app.main:app --host :: --port $PORT`. Vite 프로젝트에서 Caddyfile 인식·`dist` 경로는 **첫 배포 빌드 로그로 확인 필요** (안 되면 짧은 Dockerfile)
- **api 변수**: `PORT=8000`, `DATABASE_URL=sqlite:////data/app.db`, `LOG_DIR=/data/logs`, `SESSION_COOKIE_SECURE=true`, `ALLOWED_ORIGINS=https://<web 도메인>`, `ANTHROPIC_API_KEY`, `DEMO_PASSWORD`, `ADMIN_PASSWORD` …
- **모노레포 OK**: 레포 1개(develop 에 백·프론트), Railway 서비스별 Root Directory·Watch Paths, 배포 브랜치 `main`
- **요금(공식 문서 확인)**: Trial $5 1회/30일 · Free 월 $1 크레딧(서비스 3·0.5GB RAM·볼륨 1개 0.5GB) · Hobby 월 $5(사용량 차감). 메모리 ~$10/GB·월. 로컬 측정 uvicorn 워커 ~109MB → 상시 가동 시 월 ~$1.3~1.8 추정
- **사용 패턴**: 개발 중 가끔 확인(24시간 상시 아님) → **Serverless(슬리핑) 켜기**(5~10분 무트래픽 후 수면, 첫 요청 502 가능, 내부망 요청도 깨움) → Free 로 운영 시도, **평가 직전엔 슬리핑 끄기**
- 볼륨 붙은 서비스는 레플리카 불가·재배포 시 짧은 중단(문서). 내부망: 2025-10-16 이후 환경은 IPv4+IPv6, egress 요금 없음
- **Vercel 검토 후 비추천**: 백엔드 공개 필요, 외부 rewrite 시 Set-Cookie 전달 미확인, Host 가 백엔드 주소라 ALLOWED_ORIGINS 추가 필요, 신규 프로젝트는 upstream 캐시 헤더 존중(→ `/api` 캐시 끄기 필요), Hobby 는 개인·비상업·팀 협업 기능 없음. 장점은 PR 미리보기
- **Render 무료 비추천**: 영구 디스크 없음(SQLite 초기화), 슬립
- **사용자 확정 대기**: 이 Railway 방향 확정 → `frontend/Caddyfile` 추가, 백엔드 실행 명령 정리, `docs/06-deployment.md` Railway 절차화, `deploy/`(VM) 유지/삭제 결정
