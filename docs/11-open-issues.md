# 11. 미확정 · 문서 불일치 목록 (팀 논의용)

> 최초 작성 2026-09-14, 갱신 2026-09-15. mission.md 와 docs/01~10, features.md, handoff.md, 현재 코드(develop)를 대조한 결과다.
> 논의로 결정되면 해당 행의 **결정** 칸을 채우고, 관련 문서를 수정한 뒤 §0 으로 옮긴다.
> 결정 이유는 [12-decisions.md](12-decisions.md). mission.md 요구사항 자체를 누락·위반한 항목은 발견되지 않았다.

## 0. 확정되어 문서에 반영한 것

| 항목 | 결정 | 반영 위치 |
|------|------|-----------|
| 인증 | **JWT Bearer** (서버 측 세션 폐기) | 02 §4, features.md §0 |
| AI API | **Codyssey AI API (COPA)**, 키 이름 `COPA_API_KEY` | 01, 02 §1·§6, 03, 06, 07, 08, 09 |
| Node 버전 | **24 LTS**, `frontend/.nvmrc` 로 고정 | 06 §1 |
| 프론트 스타일 | **CSS Modules** (Tailwind 폐기) | 02 §1, 05 §1, 06 §2, 08 §3, 09 §3·§4 |
| 문서 수정 방식 | `docs/` 문서만 바꾸는 커밋은 develop 에 직접 push. 코드가 섞이면 PR | 09 §1 R3·§2-1, 10 머리말·§1-2 |
| 없는 문서 참조 · 깨진 앵커 | 실제 문서로 교체 | 01~06, 08~10 |
| **A1 계정 필드** | **안 1: email + nickname** (username 폐기) | 01, 03 §1, 04 users, 05 화면 1·2 |
| **A2 비밀번호 규칙** | **8자 이상** | 03 §1-1, 05 화면 1, 07 V03 |
| **A3 응답 형식** | **`{code: number, data: object}`**. 실패 `data` = `{message}`. **서버 응답은 성공·실패 모두 HTTP 200**, 판단은 body `code`. 문자열 에러 코드 없음. FastAPI 기본 에러도 봉투 변환. 봉투 없는 응답 = 서버 연결 실패 | 03 §0, 02 §5, 05 §4·§5, 06 §4, 07, features.md §4 |
| **A4 입력 검증 실패** | **`code: 422`** | 03, 05, 07, features.md |
| **A5 AI 실패** | **`code: 504` (AI_TIMEOUT) / `code: 502` (AI_CALL_FAILED)** | 02 §5-4, 03 §2, 05 §5, 07 |
| **A6 이메일 중복** | **`code: 409`**, 닉네임 중복 허용(검사 안 함) | 03 §1-1, 04 users, 05 화면 1, 07 V02b |
| **A7 로그아웃 · 토큰** | **access token + refresh token**, `POST /api/auth/refresh` · `POST /api/auth/logout`(refresh 행 삭제) | 01 S6, 02 §4·§5-2b, 03 §0·§1-4·§1-5, 04, 05, 06 §3, 07 V05b~f·B16·B17, 08, features.md B4·F3~F5 |
| A7-1 access token 수명 | **15분** (`JWT_EXPIRE_MINUTES=15`) | 03 §0·§7, 06 §3, 01 S6 |
| A7-2 refresh token 수명 | **1일** (`REFRESH_TOKEN_EXPIRE_DAYS=1`), 재발급 시 새 토큰이 다시 1일 | 03 §0·§7, 04, 06 §3 |
| A7-3 refresh token 형식 | **무작위 문자열(`secrets.token_urlsafe`) + SHA-256 해시 저장** | 03 §0, 04 |
| A7-4 재발급 시 회전 | **회전함** (기존 행 삭제 + 새 토큰) | 03 §1-4, 04 |
| A7-5 프론트 저장·전송 | **access·refresh 를 같은 곳(A15)에 저장, refresh 는 요청 body 로 전송** (쿠키 미사용) | 03 §0, 05 화면 2 |
| A7-6 만료 행 정리 | **하루 1회 스케줄러** (앱 lifespan 백그라운드 작업, 시작 시 1회 + 24시간마다 `DELETE ... WHERE expires_at < now`) | 02 §3, 04 refresh_tokens, 06 §6-4, 07 V05f, features.md B4 |
| A7-7 여러 기기 로그인 | **허용** (기기별 행, 로그아웃은 해당 기기만) | 04 refresh_tokens |
| **A8 관리자 기능** | **필수**. 사용자 목록·검색 / 사용자별 대화 / AI 실패 기록 / 요약 통계 / 요청 흐름 로그 5종 | features.md B15~B19·F10~F14, 01 S7, 02 §5-6, 03 §4, 04, 05 화면 5, 07, 08 |
| A9 chat_logs 컬럼 | `status`·`error_code`·`latency_ms`·`request_id` 추가, **AI 실패도 저장** | 04, 03 §2 |
| A10 users 테이블 | email·hashed_password·nickname + **role** | 04 |
| **A11 컨텍스트 범위** | **같은 사용자 최근 5건 중 성공 Q/A 만** | 02 §5-4, 03 §2, 04, 07 V12 |
| 요청 흐름 로그 저장 | **DB `server_logs` 테이블** (파일/콘솔 로그와 함께) | 03 §6, 04 |
| A12 부가 API | **항목 삭제** (`/api/health`·`/api/config`·`/api/me/server-logs`·`simulate` 는 스펙 범위 밖으로 유지) | 05 §8 |
| A13 내 로그 응답 | `data: {total, items}` + `limit`·`offset` (문서 기준) | 03 §3-1 |
| A14 챗 응답 필드 | `data: {chat_id, question, answer, created_at}` (문서 기준) | 03 §2-1 |
| **A16 합의값** | access **15분** · 컨텍스트 **5개** · AI 대기 **30초(호출 전체 상한)** · 질문 **1000자** | 03 §7, 02 §5-4, 06 §3 |
| A17 배포 | **Railway 서비스 2개 (프론트·백엔드 별도 도메인)**, 백엔드 Volume `/data` | 02, 03, 04, 05, 06, 07, 08, 09 |
| A18 CORS | **필수** (`CORS_ORIGINS` = 개발 서버 + Railway 프론트 도메인) | 06 §5·§7, 07 V22·D03·D04 |
| A19 느린 첫 응답 안내 | Railway 슬리핑 사용 시 대응, 평가 전 슬리핑 끄기 | 05 화면 3, 06 §6-4, 08 §4 |
| **A20 HTTP 클라이언트** | **httpx `AsyncClient`** (현재 코드의 `requests` 는 교체) | 02 §1·§6, features.md B8 |
| A22 백엔드 구조 | `backend/app/{routers,services,crud,models,schemas,core}` (문서 기준, 현재 `main.py` 단일 파일은 구현 시 이동) | 02 §3 |
| A23 프론트 스타일 | CSS Modules | 위 참고 |
| A24 Railway 배포 브랜치 | 백엔드·프론트 모두 `main` (문서 기준) | 06 §6-1 |
| **AI 실패 재시도** | **서버 자동 재시도 없음.** 실패 즉시 안내 → 오류 말풍선 **[다시 시도] 버튼** → 같은 질문으로 `POST /api/chat` 새 요청 | 01 S3, 02 §5-4, 03 §2-1, 05 화면 3·§5, 07 B12·B12b, features.md B9·F7 |
| **A15 토큰 저장 위치** | **`localStorage`** (access·refresh 같은 곳, refresh 는 body 전송). XSS 위험은 저장 방식이 아니라 **XSS 예방 + 피해 시간 단축**으로 대응 (12 §4) | 03 §0·§7, 05 화면 2, 12 §4, 02 §4 |
| **프론트 언어** | **TypeScript (`strict: true`)** — 기존 JS(JSX) 에서 전환. 봉투 응답·결과 코드·관리자 응답 타입 고정 | 02 §1, 05 머리말, 06 §2·§6-2, 08 §3, 09 §3, features.md §0·F1, 12 §14 |
| E3·E4·E5·E6 | 상태 표시·캡처 목록·슬립 모순 정리 | 07, 08 |

---

## A. 스펙 미확정 항목

| # | 항목 | 현재 문서 | 선택지 | 결정 |
|---|------|-----------|--------|------|
| A7-8 | 로그아웃 요청에 필요한 토큰 | body 의 refresh token 만 (03 §1-5) | 아래 상세 | **① refresh token 만 — 확정**. 여러 기기 로그인 허용(A7-7)과 맞고, access 만료 후에도 로그아웃이 실패하지 않으며, refresh 를 가진 쪽이 할 수 있는 일은 그 토큰 폐기뿐이라 악용 여지가 작다 |

> A15(토큰 저장 위치)는 **localStorage 로 확정**되어 §0 으로 옮겼다.

### A7-8 상세 — 로그아웃 요청에 어떤 토큰을 요구할까

로그아웃 API 가 **"어느 refresh token 행을 지울지"** 알아야 한다. 무엇을 받느냐에 따라 동작이 달라진다.

| 안 | 요청 | 서버 동작 | 장점 | 단점 |
|----|------|-----------|------|------|
| **① refresh 만 (초안)** | body `{refresh_token}` | 해시가 일치하는 행 1개 삭제 | access 가 이미 만료돼도 로그아웃 가능, **이 기기만** 정확히 로그아웃 | refresh token 을 가진 사람은 누구든 그 토큰을 폐기할 수 있음 (폐기는 피해가 아니라 보안상 문제 적음) |
| ② access 만 | 헤더 `Authorization` | access 에는 어느 기기인지 정보가 없음 → **그 사용자의 refresh 행 전부 삭제** (모든 기기 로그아웃) | 인증된 사용자만 호출 | access 만료(15분) 후엔 로그아웃 API 가 401 → refresh 로 재발급한 뒤 로그아웃해야 함, 다른 기기까지 로그아웃됨 (A7-7 기기별과 충돌) |
| ③ 둘 다 | 헤더 access + body refresh | access 로 사용자 확인, refresh 가 **그 사용자 소유인지** 확인 후 삭제 | 가장 엄격 | access 만료 시 먼저 재발급 필요 → 프론트 흐름 복잡 |

- **①** 은 A7-7(기기별 로그아웃)과 맞고, 만료 상황에서도 로그아웃이 실패하지 않는다.
- **②** 는 "모든 기기에서 로그아웃" 기능이 필요할 때 따로 추가하는 API 형태로 더 적합하다.

---

## C. 팀 · 협업 규칙 불일치

| # | 항목 | 위치 A | 위치 B | 결정 |
|---|------|--------|--------|------|
| C1 | 팀원 이름 | "어썸체크(팀장) · 이성준 · 박성현A" (09 §0·§3·§4·§6, 03 예시 닉네임) | 성원모 · 박성현 · 이성준 (`mission.md:7`, 10 §1-4, 08 §2) | |
| C2 | 역할 분담 | 어썸체크 = 인증·DB·인프라, 박성현A = AI, 이성준 = 프론트 전담 (09 §3) | 성원모 = 인증·보안·관리자, 박성현 = 챗·로그, 이성준 = 기반·DB·로그/관리자 화면·배포·문서 (`handoff.md`) | |
| C4 | 커밋 메시지 형식 | `type(scope): 내용`, 타입 7개, 이슈 번호 없음 (09 §2-2) | `type: 제목 #1`, 타입 8개(hotfix 포함) (10 §1-1, `handoff.md`) | |
| C5 | 브랜치 접두어 | feature·fix·docs·chore 4종 (09 §2-1) | + refactor·test, hotfix 는 main 분기 (10 §1-2) | |
| C6 | 기능 번호 체계 | B1~B16 · A1~A12 · F1~F18 · C1~C5 (09 §3·§4) | B1~B19 · F1~F14 · C1~C4 (features.md, 08 §2) | |
| C8 | 리뷰 순환 순서 | 어썸체크 → 박성현A → 이성준 (09 §3) | 성원모 → 박성현 → 이성준 (10 §1-4) | |
| C9 | 브랜치 보호 설정 | 승인 1명 필수 (09 §2-1) | docs 직접 push 허용하려면 develop 보호 규칙 bypass 필요 | GitHub 설정 방법 결정 필요 |

---

## D. 없는 파일 · 경로를 가리키는 참조

| # | 참조 | 위치 | 상태 |
|---|------|------|------|
| D3 | 프로젝트 README 가 루트에 없음 — `backend/README.md` 로 이동됐고, 로컬에서는 삭제된 상태(커밋 전) | 루트 / `backend/README.md` | 위치·존치 결정 필요 |
| D4 | README 의 문서 링크가 루트 기준 → `backend/` 에서는 깨짐 | `backend/README.md` | D3 결정 후 |
| D5 | `.github/pull_request_template.md` | 09 §2-3, 10 머리말 | **해결** — PR 템플릿 추가(v1.5), 이슈 템플릿 `.github/ISSUE_TEMPLATE/issue_template.md` 도 추가(v1.6) |
| D6 | PoC 코드 (`backend/app/`, `deploy/`, `e2e/`, `backend/scripts/e2e_flow.sh`) | 07 §4, 08 §3, 09 §7 | 이 저장소에 없음 |
| D7 | `backend/scripts/check_logs.sql` | 04 DB 확인, 08 §1 | 구현 예정 |
| D8 | `plan.md`, `theory.md`, 이전 경로 `chatbot/` | (이전 `handoff.md`) | **해결** — `handoff.md` 삭제됨(v1.5). E15 도 함께 해소 |
| D9 | `backend/.env.example` | 06 §3·§9, features.md C1 | 없음 (`frontend/.env.example` 은 있음) |

---

## E. 사실 오류 · 코드와 문서 차이

| # | 문제 | 위치 |
|---|------|------|
| E2 | 테스트 수치 불일치: 30 / 24 / 39 vs 42 / 28 / 48 | 07 §4-1 / `backend/README.md` · `handoff.md` |
| E7 | README 저장소 링크 비어 있음 | `backend/README.md` |
| E8 | README 본문이 세션·Claude·username·Nginx 기준 | `backend/README.md` (D3 과 함께 처리) |
| E9 | `python-dotenv` 를 import 하지만 `requirements.txt` 에 없음 → **2026-09-14 Railway 백엔드가 `ModuleNotFoundError: No module named 'dotenv'` 로 기동 실패 (확인됨)** | `backend/main.py:3` / `backend/requirements.txt` |
| E10 | `requirements.txt` 구성이 문서와 다름 (sqlalchemy·bcrypt·pyjwt·httpx·pydantic-settings 없음, requests 있음) | `backend/requirements.txt` / 06 §2 |
| E11 | 현재 챗 코드에 인증·검증·타임아웃 예외 처리·로그·DB 저장·봉투 응답 없음, 경로 `/chat` (스펙 `/api/chat`), `requests` 동기 호출(A20 과 다름) — 구현 전 골격 | `backend/main.py` |
| E12 | `.gitignore` 에 `node_modules`, `dist`, `*.db`, `.env.*` 없음 (frontend 는 자체 .gitignore 있음) | `.gitignore` / 06 §9 |
| E14 | `mission.md` 가 루트에 있지만 git 에 추적되지 않음 | 루트 |
| E15 | handoff.md 전체가 세션·Claude·username·400/503 기준 — 현재 결정과 다름 | **해결** — `handoff.md` 삭제(v1.5) |
| E17 | **백엔드에 `CORSMiddleware` 가 없음** → Railway 두 도메인 구성에서 브라우저 API 호출이 CORS 로 차단됨. **2026-09-15 로컬 재현 확인**: develop `backend/main.py` 에 preflight `OPTIONS /chat` (Origin: 프론트 도메인) → `405 Method Not Allowed`, `access-control-allow-origin` 헤더 없음. Railway 실배포 확인은 백엔드 기동(E9) 후 | `backend/main.py` / 06 §5·§7 |
| E18 | 현재 코드 응답이 봉투 형식이 아님 (AI API 응답 JSON 을 그대로 반환) | `backend/main.py` / 03 §0 |

---

## F. 확인이 필요한 사항 (질문)

| # | 질문 | 영향 |
|---|------|------|
| F1 | Codyssey AI API 의 **호출 제한**(분당/일일), 에러 응답 형식, 타임아웃 권장값 | 02 §6, 06 §8, 07 §3, 12 §3 |
| F2 | 모델 `gpt-5-mini` 로 확정인가? (현재 코드 값) | 02 §6, 환경변수 `AI_MODEL` 추가 여부 |
| F5 | 팀원 이름·역할(C1·C2)은 어느 버전으로 통일? 역할이 Git 이력과 맞아야 함 (mission §4-7) | 09 §3·§4·§6, README |
| F6 | 커밋·브랜치 규칙(C4·C5)은 10-pull-request.md 버전으로 통일? | 09 §2 |
| F7 | develop 보호 규칙에서 docs 직접 push 를 어떻게 허용할 것인가 (bypass 대상 지정 / 보호 규칙 미적용) | GitHub 설정, 09 §2-1 |
| F8 | README 위치(D3): 루트로 되돌릴 것인가, 로컬 삭제는 의도한 것인가 | 평가자가 처음 보는 문서 |
| F9 | `mission.md` 를 저장소에 올릴 것인가 (E14) | 문서 이력 |
| F10 | PoC 기록(07 §4, 08 §3, 09 §7)은 이 저장소에 코드가 없는데 유지할 것인가 | 07·08·09 |
| F13 | HTTP 항상 200 방식의 결과: Railway·브라우저 개발자도구·서버 접근 로그에서 실패도 200 으로 보인다. 로그 분석은 `server_logs`/애플리케이션 로그의 `code` 기준으로 한다는 점을 팀이 인지했는가 | 06 §8, 07 판정 |

---

## G. 관리자 기능 — 함께 정해야 할 것

| # | 항목 | 현재 문서 초안 | 결정 |
|---|------|----------------|------|
| G1 | 관리자 권한 판별 | `users.role` + `require_admin` 이 **매 요청 DB role 확인** (토큰에 role 미포함), 실패 `code: 403` (02 §5-3, 03 §4-0) | |
| G2 | 관리자 계정 생성 | 가입으로 불가. 서버 시작 시 `.env` `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NICKNAME` 으로 생성, 이미 있으면 `role=admin` 승격 (03 §4-0, 06 §3). 관리자 여러 명 필요 여부 | |
| G3 | 조회 전용 | 수정·삭제 API 없음 (03 §4-0) | |
| G4 | `server_logs` 보관·정리 | 무기한 보관 (초안). refresh token 과 같은 하루 1회 스케줄러로 보관 기간(예 30일) 지난 행을 지울지 | |
| G5 | 내 대화 로그에 AI 실패 기록 노출 | 성공만 노출 (03 §3-1). 사용자가 자기 실패 이력을 봐야 하는지 | **성공만 노출로 확정** — 실패 기록은 관리자 화면(F13 AI 실패 기록)에서 추적한다 |
| G6 | 개인정보 | 관리자는 다른 사용자의 질문·응답 원문을 본다. 서비스 안내 문구·문서 명시 여부 | |
| G7 | **담당자** | 미정 — 백엔드 B15~B19, 프론트 F10~F14 (C2 와 함께 결정) | **프론트 F10~F14 = 이성준 (확정)** · 백엔드 B15~B19 = 미정 |
| G8 | 감사 로그 범위 | `admin_access`(모든 관리자 API), `admin_forbidden`(403) 기록 (03 §6) | |
| G9 | 노출 금지 필드 | `hashed_password`·API 키·토큰 미포함 (03 §4-0) | |
| G10 | Railway 에서 SQL 확인 | Volume 안 SQLite 는 평가자가 직접 `sqlite3` 로 열기 어렵다. 관리자 화면·API 를 주 확인 수단으로 안내할지 | |
