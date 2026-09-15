# 07. 검증 계획 및 결과

> ⚠️ **읽기 전 주의**
> §1~§3 은 **팀 스펙(JWT · Codyssey AI API · `{code, data}` 응답 · 관리자 · Railway) 기준 검증 계획**이다. 아직 실행되지 않았다.
> §4 는 **스펙 확정 이전 참조 구현(PoC, 세션 쿠키 · Claude · Nginx)** 에서 **실제로 측정된 결과**다. 스펙과 구현이 다르므로 그대로 제출 근거로 쓸 수 없다.
> 두 절을 섞지 않는다. 스펙대로 구현이 끝나면 §1~§3 을 실행하고 그 결과로 §4 를 대체한다.
>
> **판정 기준**: 서버 응답은 항상 HTTP 200 이므로, 아래 "기대" 의 `code` 는 **body 의 `code`** 를 뜻한다 ([03-api.md](03-api.md) §0).

---

## 1. 검증 계획 (스펙 기준)

| 단계 | 방법 | 목적 | 담당 |
|------|------|------|------|
| **L1 서버 단위** | pytest + FastAPI `TestClient` (임시 DB) | 요구사항·경계 케이스 | 각 트랙 |
| **L2 API 흐름** | curl 스크립트 (body `code` 판정) | 가입→로그인→질문→응답→로그→관리자 전 흐름 | 팀장 |
| **L3 브라우저** | 수동 + (여유 시) Playwright | 화면 조작, 리다이렉트, 오류 표시, 반응형 | 이성준 |
| **L4 배포/외부망** | Railway 배포 URL 을 휴대폰 데이터망에서 접속, CORS 확인 | mission §4-6 | 팀장 |
| **L5 데이터/로그** | `sqlite3`, 로그 확인 | DB 누적 저장·로그 이벤트 증빙 | 팀장 |

### 1-1. L1 — 서버 단위 케이스

| ID | 테스트 | 기대 | mission |
|----|--------|------|---------|
| V01 | 회원가입 | HTTP 200, `code: 201`, `data` 에 `hashed_password` 없음, role=user | §4-2 |
| V02 | 같은 이메일 재가입 | `code: 409` | §4-2 |
| V02b | 다른 이메일 + 같은 닉네임 | `code: 201` (닉네임 중복 허용) | §4-2 |
| V03 | 비밀번호 7자 / 잘못된 이메일 / 닉네임 21자 | `code: 422`, `data.message` 존재, `detail` 키 없음 | §4-5 |
| V04 | DB 의 `hashed_password` 확인 | bcrypt prefix(`$2b$`), 평문 아님 | §4-2 |
| V05 | 로그인 성공 | `code: 200`, `data.access_token`·`refresh_token`·`token_type=bearer`·`expires_in=3600`·`refresh_expires_in`, `refresh_tokens` 에 해시 1행(원문 아님) | §4-2 |
| V05b | `POST /api/auth/refresh` 유효 토큰 | `code: 200`, 새 토큰 쌍, (회전 시) 이전 refresh 로 재요청하면 `code: 401` | §4-2 |
| V05c | refresh 만료 / 위조 / body 누락 | `code: 401` / `code: 401` / `code: 422` | §4-2 |
| V05d | `POST /api/auth/logout` 후 같은 refresh 로 재발급 | 로그아웃 `code: 200`, 행 삭제, 재발급 `code: 401` | §4-2 |
| V05e | 이미 폐기된 refresh 로 로그아웃 재요청 | `code: 200` (같은 결과) | §4-2 |
| V06 | 틀린 비밀번호 / 없는 이메일 | `code: 401` (메시지 동일) | §4-2 |
| V07 | `GET /api/auth/me` 유효 토큰 | `code: 200`, `data: {id, email, nickname, role}` | §4-2 |
| V08 | 토큰 없음 / 변조 / 만료 | `code: 401` | §4-2 |
| V09 | 비로그인 `POST /api/chat`, `GET /api/me/chats` | `code: 401` | §4-2 |
| V10 | 챗 성공 | `code: 200`, `data: {chat_id, question, answer, created_at}`, `chat_logs` 1건(status=success) | §4-3, §4-4 |
| V11 | 두 번째 질문 | 프롬프트에 직전 Q/A 포함 (AI 클라이언트를 목으로 두고 payload 검사) | §4-3 |
| V12 | 7번째 질문 | 컨텍스트가 `AI_CONTEXT_TURNS`(5)턴으로 제한됨, 실패 기록은 제외 | §4-3 |
| V13 | 빈 문자열 / 공백만 | `code: 422`, AI 호출 안 됨 | §4-5 |
| V14 | 1001자 → 422 / 1000자 → 200 (경계값) | | §4-5 |
| V15 | AI 타임아웃 강제 (`httpx.TimeoutException`) | `code: 504`, `chat_logs` status=error·error_code=AI_TIMEOUT, **서버 프로세스 유지** | §4-5, §6 |
| V16 | AI 500/429/연결 실패 강제 | `code: 502`, error_code=AI_CALL_FAILED | §4-5 |
| V17 | 장애 직후 정상 질문 | `code: 200` (서비스 유지) | §4-5 |
| V18 | 사용자 A 의 로그가 B 에게 안 보임 | `items` 에 타인 기록 없음 | §4-4 |
| V19 | `limit=101` / `offset` 동작, 실패 기록 미포함 | 상한 처리, 최신순, `total` 정확 | §4-4 |
| V20 | 로그 이벤트 | `request_received`·`ai_call_start`·`ai_call_success`/`ai_call_failed`·`db_save_success` 가 로그와 `server_logs` 에 존재, **비밀번호·API 키·질문 원문 미기록** | §4-5 |
| V21 | DB commit 실패 강제 | 파일 로그에 `db_save_failed`, 서버 유지 | §4-5 |
| V22 | CORS preflight (`OPTIONS`) | 허용 Origin 은 `access-control-allow-origin` 헤더 있음, 미허용은 없음 | 배포 |
| V23 | 없는 경로 / 처리 안 된 예외 | `code: 404` / `code: 500` 봉투 형식 | §4-5 |
| V30 | 서버 시작 시 관리자 시드 | `ADMIN_EMAIL` 계정 role=admin, 재시작해도 중복 생성 없음 | §2-2 |
| V31 | 일반 사용자 `GET /api/admin/*` 5종 | 모두 `code: 403`, 로그 `admin_forbidden` | §4-2 |
| V32 | 비로그인 `GET /api/admin/*` | `code: 401` | §4-2 |
| V33 | `GET /api/admin/stats` | 사용자 수·성공/실패·에러별 건수·평균 응답시간이 DB 와 일치 | §4-5 |
| V34 | `GET /api/admin/users?q=` | 이메일 부분 검색, chat_count 정확, 응답에 `hashed_password` 없음 | §4-4 |
| V35 | `GET /api/admin/users/{id}/chats` | 성공·실패 모두 최신순 / 없는 id → `code: 404` | §4-4 |
| V36 | `GET /api/admin/failures` | status=error 만, error_code·request_id 포함 | §4-5 |
| V37 | `GET /api/admin/requests/{request_id}/logs` | 해당 요청 이벤트 시간순 / 없는 id → `code: 404` | §4-5 |
| V38 | 관리자 API 호출 감사 로그 | `admin_access admin_id= path=` 기록 | §4-5 |

### 1-2. L2 — API 흐름 스크립트

```bash
BASE=${BASE:-http://localhost:8000}
EMAIL="e2e_$(date +%s)@example.com"
code() { python3 -c 'import sys,json;print(json.load(sys.stdin)["code"])'; }

# 1. 회원가입 → 201 / 2. 중복 → 409
curl -s -X POST $BASE/api/auth/signup -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password1234\",\"nickname\":\"e2e\"}" | code
curl -s -X POST $BASE/api/auth/signup -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password1234\",\"nickname\":\"e2e\"}" | code

# 3. 비로그인 차단 → 401
curl -s -X POST $BASE/api/chat -H 'Content-Type: application/json' -d '{"message":"hi"}' | code

# 4. 로그인
TOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password1234\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["access_token"])')
AUTH="Authorization: Bearer $TOKEN"

# 5. 내 정보 → 200
curl -s -H "$AUTH" $BASE/api/auth/me | code

# 6. 질문 2회 (문맥 유지 확인)
curl -s -X POST $BASE/api/chat -H "$AUTH" -H 'Content-Type: application/json' -d '{"message":"배포 방법 알려줘"}'
curl -s -X POST $BASE/api/chat -H "$AUTH" -H 'Content-Type: application/json' -d '{"message":"내가 방금 뭘 물어봤지?"}'

# 7. 입력 검증 → 422
curl -s -X POST $BASE/api/chat -H "$AUTH" -H 'Content-Type: application/json' -d '{"message":"   "}' | code

# 8. 로그 조회 → data.total ≥ 2
curl -s -H "$AUTH" "$BASE/api/me/chats?limit=20&offset=0"

# 9. 잘못된 토큰 → 401 / 10. 일반 사용자 관리자 API → 403
curl -s -H "Authorization: Bearer xxx" $BASE/api/auth/me | code
curl -s -H "$AUTH" $BASE/api/admin/stats | code

# 11. 관리자 (ADMIN_EMAIL / ADMIN_PASSWORD 는 환경변수로 전달, 스크립트에 쓰지 않음)
ATOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["access_token"])')
curl -s -H "Authorization: Bearer $ATOKEN" $BASE/api/admin/stats
curl -s -H "Authorization: Bearer $ATOKEN" "$BASE/api/admin/users?q=e2e_"
curl -s -H "Authorization: Bearer $ATOKEN" $BASE/api/admin/failures
```

체크: `201 / 409 / 401 / 200 / 문맥 반영 / 422 / total≥2 / 401 / 403 / 관리자 3종 200`

### 1-3. L3 — 브라우저 확인 항목

| ID | 사용자 행동 | 기대 결과 |
|----|-------------|-----------|
| B01 | 비로그인으로 `/chat` 접속 | `/login` 이동, 게스트 메뉴만 표시 |
| B02 | 빈 폼 제출 | 클라이언트 검증 메시지, **네트워크 요청 없음** |
| B03 | 회원가입 성공 | `/login` 이동 + 안내 + 이메일 자동 입력 |
| B04 | 같은 이메일 재가입 | "이미 가입된 이메일입니다." |
| B05 | 틀린 비밀번호 | "이메일 또는 비밀번호가 올바르지 않습니다.", 비밀번호 칸만 비움, 로그인 화면 유지 |
| B06 | 로그인 성공 | `/chat` 이동, 헤더에 닉네임·탭 표시 (관리자 탭 없음) |
| B07 | 질문 Enter 전송 | 사용자 말풍선 즉시 → 로딩 → 봇 말풍선 (같은 화면) |
| B08 | "내가 방금 뭘 물어봤지?" | 답변에 직전 질문 맥락 포함 |
| B09 | 한글 조합 중 Enter | 전송 안 됨, 조합 완료 후 Enter 는 1회만 전송 |
| B10 | 공백만 입력 | 전송 버튼 비활성 |
| B11 | 1200자 입력 | 1000자에서 잘림, 카운터 강조 |
| B12 | AI 실패 재현 (`COPA_API_KEY` 를 잘못된 값으로 두고 재배포) | 오류 말풍선 + `502 · AI_CALL_FAILED`, 서버 유지 |
| B13 | 새로고침 | 로그인 유지(`/auth/me`), 이전 대화 복원 |
| B14 | 내 대화 로그 | 카드 수 = 성공 질문 수, `total` 표시 |
| B15 | 새 계정의 로그 화면 | "아직 저장된 대화가 없습니다." |
| B16 | 로그아웃 → 뒤로가기 | Network 에 `POST /api/auth/logout`, 두 토큰 삭제, `/login` 유지 (보호 페이지 재진입 차단) |
| B17 | access token 만료 후 요청 (`JWT_EXPIRE_MINUTES=1` 로 테스트) | 화면 이동 없이 refresh 후 요청 성공 |
| B17b | refresh token 까지 무효인 상태로 요청 | 로그인 화면으로 이동 |
| B18 | 375px 폭 | 가로 스크롤 0, 1열 |
| B19 | 백엔드 중지 상태에서 질문 | "서버에 연결할 수 없습니다" 말풍선 |
| B20 | 일반 사용자가 `/admin` 직접 입력 | `/chat` 으로 이동 |
| B21 | 관리자 로그인 | 헤더에 "관리자" 탭, `/admin` 요약 카드 표시 |
| B22 | 관리자: 이메일 검색 → 사용자 선택 | 해당 사용자 대화(성공·실패 배지) 표시, 새로고침해도 `?user=` 유지 |
| B23 | 관리자: AI 실패 기록 → request_id 클릭 | 요청 흐름 타임라인 표시 |
| B24 | 관리자 화면 375px 폭 | 패널 세로 배치, 가로 스크롤 0 |

### 1-4. L4 — 배포 / 외부망 (Railway)

| ID | 확인 | 기대 |
|----|------|------|
| D01 | 휴대폰 데이터망에서 Railway 프론트 URL 접속 | 화면 로드 |
| D02 | 외부망에서 가입→로그인→질문→응답→로그→관리자 | 전 흐름 성공 |
| D03 | 브라우저 Console / Network | **CORS 오류 없음**, preflight(OPTIONS) 통과 ([06-deployment.md](06-deployment.md) §7) |
| D04 | 허용되지 않은 Origin 으로 preflight | `access-control-allow-origin` 헤더 없음 |
| D05 | 프론트 번들 검색 | `COPA_API_KEY` 값 등 비밀값 미포함 |
| D06 | 백엔드 재배포 후 기존 계정 로그인 | 성공 (Volume 에 DB 유지) |
| D07 | `/chat`, `/admin` 에서 새로고침 | 404 없이 화면 로드 (SPA fallback) |
| D08 | `git ls-files \| grep -E '(^\|/)\.env$'` | 출력 없음 |

### 1-5. L5 — 데이터 / 로그 증빙

```bash
sqlite3 backend/data/app.db < backend/scripts/check_logs.sql
sqlite3 backend/data/app.db "SELECT event, detail FROM server_logs WHERE request_id='<id>' ORDER BY id;"
grep ai_call_failed backend/logs/app.log
```
- `chat_logs` 에 질문·응답이 누적되는지, 실패는 `status=error` 로 남는지
- 한 요청의 `request_id` 로 `request_received → ai_call_start → ai_call_success → db_save_success` 가 이어지는지
- `users.hashed_password` 가 bcrypt 해시(60자)인지

---

## 2. 진행 상태

| 단계 | 상태 | 비고 |
|------|:----:|------|
| L1 서버 단위 | ⬜ 미실행 | 스펙 구현 후 |
| L2 API 흐름 | ⬜ 미실행 | 스펙 구현 후 |
| L3 브라우저 | ⬜ 미실행 | 스펙 구현 후 |
| L4 배포/외부망 | 🟡 일부 | 2026-09-14 Railway 서비스 2개 첫 배포 시도: 프론트 배포 성공, 백엔드 `ModuleNotFoundError: dotenv` 로 기동 실패. CORS 는 미검증 |
| L5 데이터/로그 | ⬜ 미실행 | 스펙 구현 후 |

---

## 3. 실제 Codyssey AI API 연동 검증 (키 설정 후)

1. `backend/.env` (배포는 Railway Variables) 에 `COPA_API_KEY` 입력 → 재시작
2. L2 스크립트 실행 (문맥 유지 항목은 실제 모델이 문장을 바꿔 말하므로 **의미로 판정**)
3. 실제 타임아웃: `AI_TIMEOUT_SECONDS=0.5` 로 낮추고 질문 → `ai_call_failed reason=timeout`, `code: 504`
4. 실제 호출 실패: `COPA_API_KEY=invalid` 로 두고 질문 → `ai_call_failed reason=auth_failed`, `code: 502`
5. rate limit: 짧은 시간에 반복 호출 → `429` → `code: 502`, 로그 `reason=rate_limited`
6. 위 3~5 직후 정상 질문이 `code: 200` 인지 확인 (서비스 유지)
7. 관리자 화면 AI 실패 기록·요청 흐름에 3~5 가 보이는지 확인

---

## 4. 참고 — 참조 구현(PoC) 실측 기록

> **이 절의 수치는 스펙 확정 이전 구현에서 측정된 실제 값이다.**
> 구성: 2026-09-14, macOS, Python 3.14.7, Node 24.11, **세션 쿠키 인증 · Anthropic Claude(mock 공급자) · 로컬 Nginx**.
> 스펙(JWT · Codyssey AI API · `{code, data}` · Railway)과 다르므로 **스펙 기준 증빙으로 사용하지 않는다.** 어떤 케이스가 스펙 전환 후에도 그대로 유효한지는 §4-4 참고.

### 4-1. 실행 결과 요약

| 단계 | 명령 | 결과 |
|------|------|:----:|
| pytest (TestClient, 임시 DB) | `cd backend && .venv/bin/python -m pytest -q` | **30 passed** |
| API 흐름 (bash+curl, 프론트 경유) | `bash backend/scripts/e2e_flow.sh` | **PASS=24 FAIL=0** (개발·운영재현 2환경) |
| 브라우저 UI (Playwright) | `pytest e2e -v` — Chromium·Firefox·WebKit | **39 passed** (2환경) |
| 운영 구성 (로컬 Nginx + 자체서명 HTTPS) | curl 수동 | **13/13** |
| 데이터/로그 | `check_logs.sql`, `grep request_id` | 확인됨 |

```
$ cd backend && .venv/bin/python -m pytest -q
..............................                                           [100%]
30 passed, 1 warning in 18.29s

$ BASE=http://127.0.0.1:5173 DEMO_PASSWORD=… bash backend/scripts/e2e_flow.sh
== RESULT: PASS=24 FAIL=0

$ BASE=http://127.0.0.1:5173 DEMO_PASSWORD=… e2e/.venv/bin/python -m pytest e2e -v
======================== 39 passed in 105.23s (0:01:45) ========================
```

### 4-2. 로그 증빙 (PoC)

```
$ grep 5d14c34e071f backend/logs/app.log
2026-09-14 11:44:11 INFO  request_received method=POST path=/api/chat request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  chat_request user_id=5 length=13 request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  ai_call_start user_id=5 provider=mock context_turns=1 request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  ai_call_success user_id=5 latency_ms=402 request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  db_save_success user_id=5 chat_id=2 status=success request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  request_completed status=200 duration_ms=412 request_id=5d14c34e071f
```

```
$ grep 351990af2cf2 backend/logs/app.log
2026-09-14 11:44:12 INFO  ai_call_start user_id=5 provider=simulate context_turns=2 request_id=351990af2cf2
2026-09-14 11:44:27 WARNING ai_call_failed user_id=5 error=AI_TIMEOUT detail=exceeded_15.0s latency_ms=15000 request_id=351990af2cf2
2026-09-14 11:44:27 INFO  db_save_success user_id=5 chat_id=4 status=error request_id=351990af2cf2
2026-09-14 11:44:27 INFO  request_completed status=503 duration_ms=15007 request_id=351990af2cf2
```

### 4-3. DB 누적 저장 (PoC, `check_logs.sql` 발췌)

```
user_id  username        total  success  error  avg_latency_ms
5        e2e_1789353850  4      2        2      401

id  username        created_at                  status   error_code  question
4   e2e_1789353850  2026-09-14 02:44:27.328661  error    AI_TIMEOUT  긴 글 요약해줘
3   e2e_1789353850  2026-09-14 02:44:12.296857  error    AI_ERROR    오류 테스트
2   e2e_1789353850  2026-09-14 02:44:11.896042  success              내가 방금 뭘 물어봤지?
1   e2e_1789353850  2026-09-14 02:44:11.472700  success              배포 방법 알려줘

username        hash_prefix  hash_len
tester          $2b$12$      60
```

### 4-4. 스펙 전환 후 재검증 필요 여부

| PoC 검증 항목 | 스펙 전환 후 |
|---------------|--------------|
| 로그인/세션 쿠키·HttpOnly·SameSite·CSRF Origin 검사 | ❌ **폐기** — JWT 헤더 방식이라 해당 없음 |
| 로그아웃 후 이전 쿠키 재사용 차단 | 🔁 **수정** — 로그아웃 후 refresh token 재발급 차단으로 대체 (V05d) |
| 아이디(username) 형식 검증 | 🔁 **수정** — 이메일 형식 + 닉네임 길이로 변경 |
| 입력 검증 400 `INVALID_INPUT` | 🔁 **수정** — `code: 422` |
| AI 타임아웃/오류 503 `AI_TIMEOUT`/`AI_ERROR` | 🔁 **수정** — `code: 504` / `code: 502` |
| 평면 에러 JSON `{error, message}` | 🔁 **수정** — `{code, data:{message}}`, HTTP 200 |
| 로그 응답 `{items, count, avg_latency_ms}` | 🔁 **수정** — `data: {total, items}` + `offset` |
| 관리자 조회 API/화면 (PoC `/api/admin/*`) | 🔁 **수정** — 실패 기록·요청 흐름 추가, email 기준 (V30~V38, B20~B24) |
| AI 실패도 `chat_logs` 에 status=error 저장 | ✅ **유효** — 스펙에 채택 |
| Nginx SPA fallback / 프록시 / Secure 쿠키 | 🔁 **대체** — Railway 두 서비스 CORS·SPA fallback 확인(D03·D07)으로 |
| 컨텍스트 최근 N턴 유지·상한 | ✅ **유효** — 동일 로직, 재실행만 필요 |
| 빈 입력/최대 길이 경계값 | ✅ **유효** — 코드만 바뀜 |
| 사용자 격리(타인 로그 미노출) | ✅ **유효** |
| AI 실패 후 서버 유지 | ✅ **유효** |
| 비밀번호 bcrypt 해시 저장 | ✅ **유효** |
| 로그 이벤트 4종 존재·비밀번호 미기록 | ✅ **유효** |
| 한글 IME Enter, 반응형, 자동 스크롤 등 UI | ✅ **유효** — 화면 재구현 후 재실행 |

### 4-5. PoC 화면 캡처

`docs/screenshots/` — **PoC UI 기준**이라 이메일/닉네임 화면과 다르다. 스펙대로 구현 후 새로 캡처해 교체한다.

| 파일 | 화면 |
|------|------|
| `01-signup-done.png` | 가입 완료 후 로그인 화면 |
| `02-chat-context.png` | 컨텍스트 유지 대화 |
| `03-chat-errors.png` | AI 오류 말풍선 |
| `04-logs.png` | 내 대화 로그 |
| `05-logs-empty.png` | 빈 로그 |
| `06-mobile-chat.png` / `07-mobile-logs.png` | 모바일 폭 |
| `08-admin.png` / `09-admin-mobile.png` | 관리자 화면 (데스크톱 / 모바일) |

### 4-6. PoC 검증 중 발견·수정한 문제 (스펙 구현 시 재발 주의)

| # | 문제 | 원인 | 조치 |
|---|------|------|------|
| 1 | 챗 진입 직후 보낸 메시지가 사라짐 | 늦게 도착한 "이전 대화 복원" 응답이 현재 메시지를 덮어씀 | 복원 결과를 현재 메시지 **앞에 병합** |
| 2 | 새로고침 시 대화가 2배로 중복 | React StrictMode 의 effect 이중 실행 | effect cleanup 의 `ignore` 플래그로 이전 실행 응답 폐기 |
| 3 | 백엔드 중단 시 "요청을 처리하지 못했습니다" — 원인 불명확 | JSON 본문 없는 게이트웨이 오류를 일반 오류로 처리 | 봉투 없는 응답 → "서버에 연결할 수 없습니다" |
| 4 | 한글 IME 조합 중 Enter 로 마지막 글자 중복 전송 | `isComposing` 미처리 | 조합 중 Enter 무시 |
| 5 | 모바일 헤더 요소 순서 뒤바뀜 | flex `order` 미지정 | 탭/사용자 order 지정 |
