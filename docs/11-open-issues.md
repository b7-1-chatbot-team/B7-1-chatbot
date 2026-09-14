# 11. 미확정 · 문서 불일치 목록 (팀 논의용)

> 작성 2026-09-14. mission.md 와 docs/01~10, features.md, backend/README.md, handoff.md, 현재 코드(develop `c81d8e6`)를 대조한 결과다.
> 논의로 결정되면 해당 행의 **결정** 칸을 채우고, 관련 문서를 수정한 뒤 행을 "완료"로 옮긴다.
> mission.md 요구사항 자체를 누락·위반한 항목은 발견되지 않았다.

## 0. 이미 확정되어 문서에 반영한 것

| 항목 | 결정 | 반영 위치 |
|------|------|-----------|
| 인증 | **JWT Bearer** (서버 측 세션 폐기) | features.md §0, backend/README.md 스택 표 (02~07 은 원래 JWT) |
| AI API | **Codyssey AI API (COPA)** — Gemini·Claude 폐기. 키 이름 `COPA_API_KEY` (현재 `backend/main.py` 기준) | 01, 02 §1·§2·§3·§5·§6, 03, 06, 07, 08, 09 |
| Node 버전 | **24 LTS**, `frontend/.nvmrc` 로 고정 | 06 §1 (`.nvmrc` 파일은 `feature/fe-setup` 브랜치) |
| 없는 문서 참조 | `기술스택_및_아키텍처.md` · `API_명세_초안.md` · `기능_리스트.md` 참조를 실제 문서(02·03·features.md)로 교체 | 01~06, 08, 09 |
| 깨진 앵커 | `10-pull-request.md` → `09-team.md#2-팀-운영-규칙` | 10 |
| 문서 수정 방식 | `docs/` 문서만 바꾸는 커밋은 develop 에 직접 push (팀 합의). 코드가 섞이면 PR | 09 §1 R3·§2-1, 10 머리말·§1-2 |
| 프론트 스타일 | **CSS Modules** (Tailwind 폐기) | 02 §1·§2, 05 §1, 06 §2, 08 §3, 09 §3·§4 |

---

## A. 스펙 미확정 · 문서마다 다른 항목

| # | 항목 | 안 1: docs 02~09 | 안 2: features.md · README · handoff | 결정 |
|---|------|------------------|---------------------------------------|------|
| A1 | 계정 필드 | email + nickname (`03-api.md:81-85`, `04-database.md:17-19`) | username (`backend/README.md:95`, `handoff.md:27`) | |
| A2 | 비밀번호 규칙 | 8자 이상 (`03-api.md:103`) | 4~72자 (`handoff.md:27`) | |
| A3 | 에러 응답 형식 | 중첩 `{"error":{"code","message"}}` (`03-api.md:36-43`) | 평면 `{error, message}` (`features.md:101`, `backend/README.md:87`) | |
| A4 | 입력 검증 실패 | 422 `VALIDATION_ERROR` (`03-api.md:49`) | 400 `INVALID_INPUT` (`features.md:17`). 같은 문서 `features.md:38,107` 은 "400 / 422" 혼용 | |
| A5 | AI 실패 코드 | 504 `AI_TIMEOUT` / 502 `AI_CALL_FAILED` (`03-api.md:53-54`) | 503 `AI_TIMEOUT` / `AI_ERROR` (`features.md:36,108-109`) | |
| A6 | 이메일 중복 코드 | 409 `EMAIL_ALREADY_EXISTS` (`03-api.md:50`) | 409 `USERNAME_TAKEN` (`08-checklist.md` §3 PoC 열) | |
| A7 | 로그아웃 API | 없음, 프론트가 토큰 삭제 (`03-api.md:192`) | `POST /api/auth/logout` (`features.md:31`, `backend/README.md:72`) | |
| A8 | 관리자 기능 | 없음 (02·03·04·05·09) | 채택 (`features.md:19,42,59`, `backend/README.md:77-79`, `10-pull-request.md:148` 예시) | |
| A9 | chat_logs 컬럼 | 4개 (`04-database.md:88-96`) | + status·error_code·latency_ms·request_id, AI 실패도 저장 (`backend/README.md:97`, `handoff.md:28`) | |
| A10 | users 테이블 | email·hashed_password·nickname (`04-database.md:78-85`) | username·password_hash·role (`features.md:65-72`, `backend/README.md:95`) | |
| A11 | 컨텍스트 범위 | 같은 사용자 최근 5건 (`04-database.md:59-62`) | 최근 5건 중 **성공** Q/A 만 (`handoff.md:29`) | |
| A12 | 부가 API (`/api/health`, `/api/config`, `/api/me/server-logs`, `simulate`) | 범위 밖 (`05-ui-ux.md:249-255`, `08-checklist.md` §3) | 목록에 포함 (`backend/README.md:68-76`, `features.md:28` health) | |
| A13 | `GET /api/me/chats` 응답 | `{total, items}` + `limit`·`offset` (`03-api.md:262-286`) | `{items, count, avg_latency_ms}` (`08-checklist.md` §3 PoC 열) | |
| A14 | 챗 응답 필드 | `{chat_id, question, answer, created_at}` (`03-api.md:220-226`) | `{chat_id, answer, latency_ms, context_turns, saved, request_id, created_at}` (`backend/README.md:86`) | |
| A15 | 토큰 저장 위치 | localStorage 유력, 미확정 (`03-api.md:364`, `05-ui-ux.md:121-128`) | — | |
| A16 | 합의값: JWT 만료 60분 · N=5 · 타임아웃 30초 · 1000자 | 전부 "합의 필요" (`03-api.md:359-362`) | 확정처럼 기술 (`handoff.md:27-29`) | |
| A17 | 배포 방식 (**보류 중**) | Render + Vercel (`02-architecture.md:40-41`, `06-deployment.md` §6) | Nginx 동일 도메인 (`features.md:20`, `backend/README.md:15,151`) / Railway (`handoff.md:18,96-116`) | 보류 |
| A18 | CORS 필요 여부 (A17 에 종속) | 필수 (`06-deployment.md` §5) | "개발용" (`features.md:28`) | |
| A19 | 콜드 스타트 안내 문구 (A17 에 종속) | Render 슬립 대응 (`05-ui-ux.md:163`) | — | |
| A20 | HTTP 클라이언트 | httpx + AsyncClient (`02-architecture.md:21,267`, `06-deployment.md:26`, `features.md:35`) | 현재 코드 `requests` 동기 호출 (`backend/main.py:3,26`, `backend/requirements.txt`) | |
| A21 | 챗 엔드포인트 경로 | `POST /api/chat` (`03-api.md:203`) | 현재 코드 `POST /chat` (`backend/main.py:24`) | |
| A22 | 백엔드 구조 | `backend/app/{routers,services,crud,models,schemas,core}` (`02-architecture.md` §3) | 현재 코드 `backend/main.py` 단일 파일 | |
| A23 | 프론트 스타일 | ~~Tailwind CSS~~ | 자체 CSS (`08-checklist.md` §3 PoC 열) | **완료: CSS Modules** (§0) |

---

## C. 팀 · 협업 규칙 불일치

| # | 항목 | 위치 A | 위치 B | 결정 |
|---|------|--------|--------|------|
| C1 | 팀원 이름 | "어썸체크(팀장) · 이성준 · 박성현A" (`09-team.md:4,91-93,105-152`, `03-api.md:71,198,257`, `08-checklist.md:114-196`) | 성원모 · 박성현 · 이성준 (`mission.md:7`, `backend/README.md:8`, `10-pull-request.md:33`) | |
| C2 | 역할 분담 | 어썸체크 = 인증·DB·인프라, 박성현A = AI, 이성준 = 프론트 전담 (`09-team.md:91-93`) | 성원모 = 인증·보안·관리자, 박성현 = 챗·로그, 이성준 = 기반·DB·로그/관리자 화면·배포·문서 (`backend/README.md:157-159`, `handoff.md:74`) | |
| C3 | 역할 분담 (세 번째 버전) | — | 성원모 = B3~B6·F2~F5, 박성현 = B7~B11·B13·F6~F8, 이성준 = B1·B2·B12·B14·F1·F9·C1~C3 (`features.md:137-139`) | |
| C4 | 커밋 메시지 형식 | `type(scope): 내용`, 타입 7개, 이슈 번호 없음 (`09-team.md:50-59`) | `type: 제목 #1`, 타입 8개(hotfix 포함) (`10-pull-request.md:10-15`, `handoff.md:32`) | |
| C5 | 브랜치 접두어 | feature·fix·docs·chore 4종 (`09-team.md:34-39`) | + refactor·test, hotfix 는 main 분기 (`10-pull-request.md:19-23`, `handoff.md:31`) | |
| C6 | 기능 번호 체계 | B1~B16 · A1~A12 · F1~F18 · C1~C5 (`09-team.md:91-93`, `08-checklist.md` §1·§2 — 예: `08-checklist.md:14` "F11") | B1~B15 · F1~F10 · C1~C4, A 번호 없음 (`features.md`) | |
| C7 | docs 직접 push | 모든 병합은 PR 로만, develop 직접 push 금지 (`09-team.md:12,27-28`, `10-pull-request.md:4`) | docs 수정은 develop 직접 push (팀 합의) | **완료: 09·10 에 예외로 명문화** (§0) |
| C8 | 리뷰 순환 순서 | 어썸체크 → 박성현A → 이성준 (`09-team.md:101`) | 성원모 → 박성현 → 이성준 (`10-pull-request.md:33`) | |
| C9 | 브랜치 보호 설정 | 승인 1명 필수 (`09-team.md:41`) | C7 의 직접 push 와 충돌 (보호 규칙에 예외 필요). 09 §2-1 에 bypass 필요라고 적어 둠 | GitHub 설정 방법 결정 필요 |

---

## D. 없는 파일 · 경로를 가리키는 참조

| # | 참조 | 위치 | 상태 |
|---|------|------|------|
| D1 | `기술스택_및_아키텍처.md`, `API_명세_초안.md`, `기능_리스트.md` | 01·02·03·04·05·06·08·09 | **수정 완료** (§0) |
| D2 | `09-team.md#2-브랜치-전략--커밋-컨벤션` 앵커 | `10-pull-request.md:3` | **수정 완료** (§0) |
| D3 | `README.md` 가 루트에 없음 — `backend/README.md` 로 이동됨 (커밋 `3c64683`). 내용은 프로젝트 전체 README | `backend/README.md` | 위치 결정 필요 |
| D4 | README 의 문서 링크가 루트 기준 (`docs/01-scenario.md`, `features.md`) → `backend/` 에서는 전부 깨짐. `features.md` 는 원래도 `docs/features.md` | `backend/README.md:21-31,62,89,104,151,165,184` | D3 결정 후 수정 |
| D5 | `.github/pull_request_template.md` | `09-team.md:67`, `10-pull-request.md:5` | 파일 없음 |
| D6 | PoC 코드 (`backend/app/`, 기존 `frontend/`, `deploy/`, `e2e/`, `backend/scripts/e2e_flow.sh`) | `07-verification.md` §4, `08-checklist.md` §3, `09-team.md` §7, `backend/README.md:106-128` | 이 저장소에 없음 |
| D7 | `backend/scripts/check_logs.sql` | `04-database.md:121`, `08-checklist.md:28`, `backend/README.md:102` | 아직 없음 (구현 예정이면 유지) |
| D8 | `plan.md`, `theory.md`, 이전 경로 `chatbot/` | `handoff.md:4,65` | 이 저장소에 없음 |
| D9 | `backend/.env.example`, `frontend/.env.example` | `06-deployment.md:53,204`, `features.md` C1 | backend 쪽 없음 (frontend 는 `feature/fe-setup` 에 추가) |

---

## E. 사실 오류 · 상태 표시 문제

| # | 문제 | 위치 |
|---|------|------|
| E1 | DB 경로 불일치: `./data/app.db`(= `backend/data/app.db`) vs `backend/app.db` | `04-database.md:5,121` · `06-deployment.md:62` / `backend/README.md:102` · `handoff.md:84` |
| E2 | 테스트 수치 불일치: 30 / 24 / 39 vs 42 / 28 / 48 | `07-verification.md:174-189` / `backend/README.md:122-128` · `handoff.md:50-52` |
| E3 | 구현 전인데 ✅ 표시: DB 확인 3종 | `08-checklist.md:28` |
| E4 | 배포 방식 미확정인데 "배포 문서화 ✅" | `08-checklist.md:29,83` |
| E5 | 캡처 목록에 `08-admin.png`, `09-admin-mobile.png` 누락 | `07-verification.md:251-258` |
| E6 | "Render 슬립·재배포 시 JWT 는 영향 없음" ↔ "재배포로 SQLite 초기화 → 계정 삭제 → 401" 모순 | `02-architecture.md:141,150` / `06-deployment.md:194` |
| E7 | README 저장소 링크 비어 있는데 "GitHub Repository 생성" 체크 | `backend/README.md:7,187` |
| E8 | README 본문이 세션·Claude 기준 (API·DB·환경변수·민감정보 체크): `sessions` 테이블, `ANTHROPIC_API_KEY`, `SESSION_*`, `sk-ant` 검사 | `backend/README.md:46-58,72,96,135-148,172,177` |
| E9 | `python-dotenv` 를 import 하지만 `requirements.txt` 에 없음 → 새 가상환경에서 `ModuleNotFoundError` | `backend/main.py:3` / `backend/requirements.txt` |
| E10 | `requirements.txt` 버전·구성이 문서와 다름 (fastapi 0.141.1 vs 0.115.6, sqlalchemy·bcrypt·pyjwt·httpx·pydantic-settings 없음, requests 있음) | `backend/requirements.txt` / `06-deployment.md:17-28` |
| E11 | 현재 챗 코드에 타임아웃 예외 처리·로그·DB 저장·인증 없음 — AI 응답을 그대로 반환 (mission §4-3~§4-5 미충족 상태, 구현 전 골격으로 보임) | `backend/main.py:24-42` |
| E12 | `.gitignore` 에 `node_modules`, `dist`, `*.db`, `.env.*` 없음 (문서 기준과 다름) | `.gitignore` / `06-deployment.md:203` |
| E13 | Node 요구 버전 20+ → 24 로 변경 (Node 20 은 2026-04 지원 종료) | `06-deployment.md:8` **수정 완료** |
| E14 | `mission.md`, `handoff.md` 가 루트에 있지만 git 에 추적되지 않음 | 루트 |
| E15 | handoff.md 전체가 세션·Claude·username·400/503 기준 — 현재 결정과 다름 | `handoff.md:17,25-29,37-44` |

---

## F. 확인이 필요한 사항 (질문)

| # | 질문 | 영향 |
|---|------|------|
| F1 | Codyssey AI API 의 **호출 제한**(분당/일일), 에러 응답 형식, 타임아웃 권장값 | 02 §6, 06 §8 트러블슈팅, 07 §3 |
| F2 | 모델 `gpt-5-mini` 로 확정인가? (현재 코드 값) | 02 §6, 환경변수에 `AI_MODEL` 추가 여부 |
| F3 | A1~A23 을 **docs 02~09 쪽(안 1)으로 일괄 통일**할 것인가, 항목별로 정할 것인가 | features.md · README 대폭 수정 |
| F4 | 관리자 기능(A8) 유지 / 제외 | features.md B15·F10, README, 10 예시 |
| F5 | 팀원 이름·역할(C1~C3)은 어느 버전으로 통일? 역할이 Git 이력과 맞아야 함 (mission §4-7) | 09 §3·§4·§6, README §6, features §6 |
| F6 | 커밋·브랜치 규칙(C4·C5)은 10-pull-request.md 버전으로 통일? | 09 §2 |
| F7 | develop 보호 규칙에서 docs 직접 push 를 어떻게 허용할 것인가 (보호 규칙 bypass 대상 지정 / 보호 규칙 미적용). 명문화는 완료 | GitHub 설정, 09 §2-1 |
| F8 | README 위치(D3): 루트로 되돌릴 것인가 | 평가자가 처음 보는 문서 |
| F9 | `mission.md`, `handoff.md` 를 저장소에 올릴 것인가 (E14). handoff.md 는 현재 결정과 다름 | 문서 이력 |
| F10 | PoC 기록(07 §4, 08 §3, 09 §7)은 이 저장소에 코드가 없는데 유지할 것인가 | 07·08·09 |
| F11 | HTTP 클라이언트 httpx / requests (A20) — 비동기 필요 여부 | backend 구현 |
| F12 | 배포 방식(A17) — 보류 중, 결정 시 A18·A19·E4·E6 함께 정리 | 02·05·06·07·08 |
