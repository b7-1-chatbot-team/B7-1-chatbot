# 09. 팀 규칙 · 역할 분담

> 기준 문서: [features.md](features.md) · 팀원 이름·역할·규칙 불일치: [11-open-issues.md](11-open-issues.md) §C
> 팀: **어썸체크(팀장) · 이성준 · 박성현A** (3인, 120시간 Term Project)

## 1. mission 이 강제하는 필수 규칙 (위반 시 감점)

| # | 규칙 | 근거 | 확인 방법 |
|---|------|------|-----------|
| R1 | **브랜치 전략 적용**: `main` / `develop` 분리 | §4-7 | `git branch -a` |
| R2 | **기능 단위 작업 브랜치**에서 작업 (`feature/*`) | §4-7 | `git log --graph --all` |
| R3 | **PR 기반 Merge** — 코드 병합은 GitHub PR 로만. **예외: `docs/` 문서만 바꾸는 커밋은 develop 에 직접 push** (팀 합의, §2-1) | §4-7, §6 | `git log --merges`, GitHub PR 목록 |
| R4 | **팀원별 유의미한 커밋 10회 이상** | §4-7, §6 | `git shortlog -sn` |
| R5 | 문서에 **팀 역할 / 개인별 작업 요약** 포함, **Git 이력과 모순 없게** | §2-2, §4-7 | README §6 ↔ shortlog |
| R6 | API 키·비밀번호 등 **민감정보를 코드/문서에 직접 작성 금지** | §6 | `grep`, PR 리뷰 |
| R7 | 모든 민감정보는 **환경변수(.env)** 로 관리, `.env` 는 **.gitignore** | §6 | `git ls-files` |
| R8 | README 에 **환경변수 키 목록(이름)과 설정 방법** | §6 | README §5 |
| R9 | AI 호출 **타임아웃** 설정 + 실패 시 **오류 안내** 반환 | §6 | `AI_TIMEOUT_SECONDS`, 504/502 응답 |
| R10 | 요청 수신 · AI 호출/응답 · DB 저장 성공/실패 **로그** 유지 | §6 | `app.log` 이벤트 확인 |
| R11 | 평가 시점 **외부 네트워크 접속 가능** 상태 유지 | §4-6 | 외부망에서 배포 URL 접속 |

## 2. 팀 운영 규칙

### 2-1. 브랜치

```
main       ← 배포 브랜치. 직접 push 금지. develop → main PR 로만 병합
 └ develop ← 통합 브랜치. 코드는 직접 push 금지(feature → develop PR). docs/ 문서 수정만 직접 push 허용
    ├ feature/be-auth-jwt
    ├ feature/ai-chat-pipeline
    └ feature/fe-chat-ui
```

| 접두어 | 용도 | 예 |
|--------|------|----|
| `feature/` | 기능 추가 | `feature/ai-context` |
| `fix/` | 버그 수정 | `fix/token-refresh-redirect` |
| `docs/` | 문서만 | `docs/api-spec` |
| `chore/` | 설정·빌드·배포 | `chore/render-deploy` |

GitHub 설정: Settings → Branches → `main`, `develop` 에 **Require a pull request before merging** + **Require approvals: 1**.

**docs 직접 push 규칙 (팀 합의)**

| 항목 | 규칙 |
|------|------|
| 대상 | `docs/` 아래 문서만 바뀌는 커밋. 코드·설정 파일이 하나라도 섞이면 브랜치 + PR |
| 브랜치 | `develop` 에서 작업 → `git pull origin develop` 후 수정 → `origin develop` 에 push |
| 커밋 메시지 | `docs: 요약` (커밋 컨벤션 동일) |
| `main` | 예외 없음. develop → main PR 로만 병합 |
| 보호 규칙 | `develop` 보호 규칙에 팀원 bypass 허용이 필요 (bypass 없으면 직접 push 가 거부됨) |

### 2-2. 커밋 — "유의미한 커밋" 기준

mission 이 "유의미한" 커밋을 요구하므로 아래는 **커밋으로 세지 않는다**고 팀 내 합의한다.
- 오타 1글자, 공백/포맷만, 빈 커밋, 같은 내용 되돌리기 반복, 파일 1개를 쪼개 올리기

**좋은 커밋 = 하나의 논리적 변경 + 동작하는 상태 + 설명 가능한 메시지**

메시지 형식 (Conventional Commits):
```
<type>(<scope>): <무엇을 왜>

feat(auth): 로그인 시 JWT 발급과 만료 시간 적용
feat(chat): 최근 N턴 컨텍스트를 AI 요청에 포함
fix(fe): 401 수신 시 토큰 삭제 후 로그인 화면으로 이동
docs(api): /api/me/chats 요청·응답 예시 추가
```
type: `feat` `fix` `test` `docs` `refactor` `chore` `style`

- 커밋 author 이메일은 **본인 GitHub 계정 이메일**로 설정 (`git config user.email`) → shortlog 집계 정확성
- 페어 작업 시 `Co-authored-by:` 트레일러 사용

### 2-3. PR

- 제목: 커밋 규칙과 동일 형식
- 본문 템플릿 (`.github/pull_request_template.md`):
  ```
  ## 변경 내용
  ## 관련 요구사항 (mission §, features.md #)
  ## 검증 (실행한 확인 절차 / 스크린샷)
  ## 체크
  - [ ] 로컬 실행 확인  - [ ] 민감정보 없음  - [ ] 문서 갱신 필요 여부 확인
  ```
- **리뷰어 1명 승인** 후 작성자가 머지. 머지 방식은 **Merge commit** (Squash 금지 → 개인 커밋 수와 머지 기록이 모두 남도록)
- PR 크기: 변경 400줄 이하 권장, 1 PR = 1 기능

### 2-4. 기타

- 매일 짧은 스탠드업(어제/오늘/막힘), 이슈는 GitHub Issues 로 관리
- `.env` 값 공유는 저장소/채팅 평문 금지 → 직접 전달
- 충돌 방지: 작업 시작 전 `git pull origin develop`, 공용 파일(`main.py`, `config.py`) 수정 시 채널에 공지
- **인터페이스 우선 합의**: 백엔드 두 트랙과 프론트가 병렬로 진행하므로 [03-api.md](03-api.md) 를 먼저 확정하고, API 가 바뀌면 03-api.md 를 함께 수정한다

## 3. 역할 분담

3트랙으로 나눈다. (아래 담당 번호는 [features.md](features.md) 번호 체계와 다르다 — [11-open-issues.md](11-open-issues.md) C6)

| 팀원 | 역할 | 담당 범위 (features.md #) | 주요 산출물 |
|------|------|---------------------------|-------------|
| **어썸체크** (팀장) | 인증 · DB · 인프라 | B1~B16, C1~C5 | `core/security.py`, `core/dependencies.py`, `routers/auth.py`, `routers/logs.py`, `models/`, `crud/`, `database.py`, `config.py`, `main.py`(CORS), `.env.example`, `.gitignore`, `scripts/check_logs.sql`, Render/Vercel 배포, README |
| **박성현A** | AI 파이프라인 | A1~A12 | `routers/chat.py`, `services/ai_service.py`, `schemas/chat.py`, `core/logging.py`, 에러 코드·안내 문구 |
| **이성준** | 프론트엔드 (React) | F1~F18 | `src/api/`, `src/contexts/AuthContext`, `src/pages/{Login,Signup,Chat,Logs}`, `src/components/`, CSS Modules·디자인 토큰, 라우팅 가드 |

**의존 관계 / 순서**

1. 팀장이 **B1~B4(구조·설정·CORS·DB 세션) + B12(인증 dependency)** 를 먼저 올려야 나머지 두 트랙이 붙을 수 있다.
2. 박성현A 는 인증 dependency 가 나오기 전에는 **mock 사용자**로 `POST /api/chat` 을 먼저 만들고, 이후 dependency 로 교체한다.
3. 이성준은 백엔드보다 먼저 시작할 수 있다 — [03-api.md](03-api.md) 기준으로 **목 응답(msw 또는 로컬 stub)** 으로 화면을 만들고 나중에 실 API 로 교체한다.

공통: 코드 리뷰는 **순환**(어썸체크 → 박성현A → 이성준 → 어썸체크), 최종 통합 확인·평가 리허설은 3명 함께.

## 4. 브랜치·커밋 계획 (팀원별 10회 이상 보장)

### 어썸체크 — 인증 / DB / 인프라 (계획 15 커밋)

| 브랜치 | 커밋 |
|--------|------|
| `chore/init` | 1 `chore: 저장소 구조·.gitignore·.env.example` · 2 `chore(be): FastAPI 앱 골격과 라우터 등록` · 3 `chore(be): CORS 설정과 환경변수 로딩` |
| `feature/be-db` | 4 `feat(db): SQLAlchemy 엔진·세션과 get_db 의존성` · 5 `feat(db): users·chat_logs 모델` · 6 `feat(crud): user·chat_log 리포지토리 계층 분리` |
| `feature/be-auth-jwt` | 7 `feat(auth): bcrypt 해시·검증 유틸` · 8 `feat(auth): 회원가입 API 와 이메일 중복 409` · 9 `feat(auth): 로그인 JWT 발급` · 10 `feat(auth): get_current_user 인증 dependency` · 11 `feat(auth): /api/auth/me 로 상태 복원 지원` |
| `feature/be-logs` | 12 `feat(logs): /api/me/chats 사용자 스코프 조회와 페이지네이션` · 13 `feat(log): DB 저장 성공/실패 로깅` |
| `chore/deploy` | 14 `chore(deploy): Render·Vercel 배포 설정과 CORS 도메인` |
| `docs/*` | 15 `docs: README 총괄 작성` |

### 박성현A — AI 파이프라인 (계획 12 커밋)

| 브랜치 | 커밋 |
|--------|------|
| `feature/ai-client` | 1 `feat(ai): httpx Codyssey AI API 클라이언트 모듈 분리` · 2 `feat(ai): API 키 환경변수 로드` · 3 `feat(ai): 호출 타임아웃 설정` |
| `feature/ai-chat` | 4 `feat(chat): /api/chat 엔드포인트와 인증 적용` · 5 `feat(chat): 요청·응답 Pydantic 스키마` · 6 `feat(chat): 서버 측 입력 검증 422` · 7 `feat(chat): 최근 N턴 컨텍스트 구성` · 8 `feat(chat): 컨텍스트 길이 초과 시 오래된 턴 제거` |
| `feature/ai-errors` | 9 `feat(chat): 타임아웃 시 AI_TIMEOUT 504 반환` · 10 `feat(chat): 호출 실패 시 AI_CALL_FAILED 502 반환` |
| `feature/ai-logging` | 11 `feat(log): request_id 와 AI 호출 이벤트 로그 4종` |
| `docs/*` | 12 `docs(api): 챗 엔드포인트 명세·에러 코드 정리` |

### 이성준 — 프론트엔드 (계획 14 커밋)

| 브랜치 | 커밋 |
|--------|------|
| `chore/fe-init` | 1 `chore(fe): Vite+React+Router 초기 설정` · 2 `chore(fe): 전역 CSS 변수(디자인 토큰)와 CSS Modules 규칙` |
| `feature/fe-api` | 3 `feat(fe): axios 인스턴스와 Authorization 인터셉터` · 4 `feat(fe): 공통 에러 파싱과 401 전역 처리` |
| `feature/fe-auth` | 5 `feat(fe): 회원가입 화면과 에러 코드 분기` · 6 `feat(fe): 로그인 화면과 토큰 저장` · 7 `feat(fe): AuthContext 로 인증 상태 전역 관리` · 8 `feat(fe): /auth/me 로 새로고침 상태 복원` · 9 `feat(fe): 로그아웃과 라우팅 가드` |
| `feature/fe-chat` | 10 `feat(fe): 질문 입력과 대화 말풍선 UI` · 11 `feat(fe): 로딩 상태와 클라이언트 입력 검증` · 12 `feat(fe): 에러 코드별 안내 말풍선` |
| `feature/fe-logs` | 13 `feat(fe): 내 대화 로그 화면과 더 보기` |
| `fix/*` | 14 `fix(fe): 한글 IME 조합 중 Enter 전송 방지` |

## 5. 일정 (120시간 기준)

| 주차 | 목표 | 완료 기준 |
|------|------|-----------|
| 1 | 저장소·브랜치·골격, `03-api.md` 확정, DB 모델, 인증 API | develop 에서 가입→로그인→`/auth/me` curl 성공 |
| 2 | 챗 파이프라인(컨텍스트·검증·타임아웃·로그), 프론트 4화면 | 로컬에서 가입→로그인→질문→응답→로그 전 흐름 동작 |
| 3 | Render·Vercel 배포, CORS 정리, 실제 Codyssey AI API 연동 | 외부망에서 배포 URL 로 전 흐름 재현 |
| 4 | 문서 마감, 역할 요약·커밋 수 반영, 평가 리허설 | docs/08 체크리스트 전부 체크 |

## 6. 개인별 작업 요약 (마감 시 실제 값으로 갱신)

| 팀원 | 역할 | 주요 작업 | 커밋 수 | PR |
|------|------|-----------|:------:|:--:|
| 어썸체크 | 인증·DB·인프라 | _(실제 작업 기입)_ | _ | _ |
| 박성현A | AI 파이프라인 | _(실제 작업 기입)_ | _ | _ |
| 이성준 | 프론트엔드 | _(실제 작업 기입)_ | _ | _ |

```bash
git shortlog -sn --no-merges          # 커밋 수 (머지 커밋 제외)
git log --merges --oneline            # PR 머지 기록
gh pr list --state merged --json number,title,author --limit 100
```

## 7. 참고: 이 저장소의 PoC 코드

`backend/`, `frontend/` 에 있는 현재 코드는 스펙 확정 **이전에 만든 참조 구현(PoC)** 이다.
세션 쿠키 인증 · Anthropic Claude · Nginx 배포 기준이라 위 스펙과 다르다. 차이 목록은 [08-checklist.md](08-checklist.md) §3 을 참고한다.

팀은 각자 브랜치에서 스펙대로 직접 구현·커밋해야 한다. **PoC 코드를 한 번에 통째로 올리면 R2~R5 를 충족하지 못한다.**
