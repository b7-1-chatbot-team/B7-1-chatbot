# 07. 검증 절차 및 결과

PoC 는 **5단계**로 검증한다. 모든 결과는 실제 실행 출력이다 (2026-09-14, macOS, Python 3.14.7, Node 24.11, AI_PROVIDER=mock).

| 단계 | 방법 | 목적 | 명령 | 결과 |
|------|------|------|------|:----:|
| L1 서버 | pytest + TestClient (격리 임시 DB) | 요구사항·경계·운영·**관리자** 케이스 | `cd backend && .venv/bin/python -m pytest -v` | **42/42** |
| L2 API 흐름 | bash + curl, **프론트 경유** | 사용자·관리자 흐름을 브라우저와 같은 경로로 | `BASE=… DEMO_PASSWORD=… ADMIN_PASSWORD=… bash backend/scripts/e2e_flow.sh` | **28/28** |
| L3 브라우저 UI | **Playwright** — Chromium · Firefox · WebKit(Safari 엔진), 데스크톱 + 모바일 폭 | 실제 화면 조작, 리다이렉트, 오류 표시, 반응형, 관리자 화면 | `BASE=… DEMO_PASSWORD=… ADMIN_PASSWORD=… e2e/.venv/bin/python -m pytest e2e -v` | **48/48** |

> 관리자 기능 추가 전 1차 검증: L1 30/30, L2 24/24·L3 39/39 (개발 서버 + 로컬 Nginx HTTPS 두 환경). 관리자 추가 후 2차 검증은 개발 서버 기준.
| L4 운영 구성 | **로컬 Nginx(HTTPS 자체서명) + 운영 설정 백엔드** | 리버스 프록시·Secure 쿠키·SPA 라우팅·CSRF·장애 | curl 수동 (§4) | **13/13** |
| L5 데이터/로그 | sqlite3, grep | DB 누적 저장·로그 이벤트 증빙 | `check_logs.sql`, `grep request_id` | 확인 |

- **환경 A (개발)**: `Vite :5173 → /api 프록시 → uvicorn :8000` (`SESSION_COOKIE_SECURE=false`)
- **환경 B (운영 재현)**: `Nginx https://localhost:8443 → uvicorn :8001` (`APP_ENV=production`, `SESSION_COOKIE_SECURE=true`, `ALLOWED_ORIGINS=https://localhost:8443`, 별도 DB) — `deploy/nginx/chatlog.conf` 와 동일 구성

---

## 1. L1 — pytest 30 케이스

### 1-1. 요구사항 (tests/test_api.py, 20)
| ID | 테스트 | mission |
|----|--------|---------|
| V01 | health 200, `X-Request-ID` 헤더 | §4-6 |
| V02 | 공개 설정에 키 필드 없음 | §6 |
| V10 | 데모 계정 로그인, 쿠키 `HttpOnly`·`SameSite=Lax` | §4-2 |
| V11 | 회원가입 201 / 중복 409 / 형식 오류 400 | §4-2, §4-5 |
| V12 | 틀린 비밀번호 401 | §4-2 |
| V13 | 비로그인 `/api/chat`, `/api/me/chats`, `/api/auth/me` → 401 | §4-2 |
| V14 | 로그아웃 후 **이전 쿠키 재사용 401** (서버 측 무효화) | §4-2 |
| V15 | 외부 Origin POST → 403 | 보안 |
| V20 | 챗 성공 200, `saved=true`, `chat_id` | §4-3, §4-4 |
| V21 | 두 번째 질문에 직전 질문 반영 (`context_turns=1`) | §4-3 |
| V22 | 8번째 질문의 컨텍스트가 5턴으로 제한 | §4-3 |
| V30 | 빈 문자열 / 공백만 → 400 | §4-5 |
| V31 | 1001자 → 400, 1000자 → 200 (경계값) | §4-5 |
| V40 | 타임아웃 → 503 `AI_TIMEOUT` + 안내 문구, 이후 health 200 | §4-5, §6 |
| V41 | AI 오류 → 503 `AI_ERROR` | §4-5 |
| V42 | 실패도 DB 기록(`status=error`), 다음 컨텍스트에서 제외 | §4-4 |
| V50 | 사용자 A 로그가 B 에게 안 보임, 필수 필드 포함 | §4-4 |
| V51 | 서버 로그 패널 API 가 본인 요청 로그 반환 | §4-5 |
| V60 | `app.log` 에 필수 이벤트 존재, 비밀번호 미기록 | §4-5 |
| V61 | DB commit 실패 강제 → `db_save_failed` + 답변 반환(`saved=false`) | §4-5 |

### 1-2. 경계·운영 (tests/test_edge.py, 10)
| ID | 테스트 |
|----|--------|
| V70 | 세션 만료 → `401 SESSION_EXPIRED`, 만료 세션 행 삭제 → 이후 `UNAUTHORIZED` |
| V71 | `DEMO_MODE=false` 에서 `simulate` → 400, 일반 질문은 200 |
| V72 | `DEMO_PASSWORD` 비어 있으면 데모 계정 생성 안 함 |
| V73 | 데모 계정 시드 반복 실행해도 1개 (멱등) |
| V74 | 같은 사용자 **동시 질문 10건** → 전부 200, DB 10건 저장 |
| V75 | 같은 아이디 **동시 가입 5건** → 201 1건 + 409 4건 (UNIQUE 경합 처리) |
| V76 | 로그 파일 회전 설정 (2MB × 3개) |
| V77 | 회전 동작: 작은 크기로 기록 시 `app.log`, `.1~.3` 생성 |
| V78 | 기록 250건: `limit=200` → 200건·count 250·최신순·평균, `limit=500` → 400 |
| V79 | 없는 경로 404 `NOT_FOUND`, 잘못된 메서드 405 |

### 1-3. 관리자 (tests/test_admin.py, 12)
| ID | 테스트 |
|----|--------|
| V80 | 게스트 → 관리자 API 3종 401 |
| V81 | 일반 사용자 → 관리자 API 3종 `403 FORBIDDEN` |
| V82 | `/api/auth/me` 의 role: 관리자 `admin`, tester `user` |
| V83 | 사용자 목록 집계: 대화 3·실패 1·최근 활동, `password_hash` 미포함 |
| V84 | 검색 결과 0건, `limit=1` 페이지, `limit=500` → 400, 최근 활동 순 |
| V85 | 타 사용자 대화 3건 조회, 전부 해당 user_id, `status=error` 필터 1건, 잘못된 status 400 |
| V86 | 없는 사용자 `404 USER_NOT_FOUND` |
| V87 | 가입 요청에 `"role":"admin"` 넣어도 `user` 로 생성, 관리자 API 403 (권한 상승 차단) |
| V88 | 관리자 시드: 없는 아이디 생성·로그인 / 기존 사용자 승격 / 비밀번호 없으면 생략 |
| V89 | role 컬럼 없는 **구 DB 마이그레이션**: 컬럼 추가·기존 행 `user`·재실행 시 변경 없음 |
| V90 | 감사 로그 `admin_list_users q=`, `admin_view_chats target_user_id=`, `admin_access_denied` |
| V91 | 같은 세션에서 **강등 즉시 403** (재로그인 없이) |

```
$ cd backend && .venv/bin/python -m pytest -q
..........................................                               [100%]
42 passed, 1 warning in 28.69s
```
실행 중 서버에서 기존 `app.db` 에 `role` 컬럼 자동 추가·`admin_user_seeded action=created` 로그 확인.

---

## 2. L2 — API 사용자 흐름 (24 케이스)

신규 사용자 1명 + 데모 계정으로 시나리오 S1~S6 수행. 격리 검사(E63)는 실행마다 **사용자명이 들어간 고유 질문**을 사용한다.

```
== BASE=http://127.0.0.1:5173
[1] 서비스 접근
  PASS E01   프론트 페이지 로드                       (200)
  PASS E02   헬스 체크 /api/health                    (200)
[2] 비로그인 사용자
  PASS E10   비로그인 챗 요청 차단                    (401)
  PASS E11   비로그인 로그 조회 차단                  (401)
[3] 신규 사용자: 회원가입 → 로그인
  PASS E20   회원가입                                 (201)
  PASS E21   중복 가입 거부                           (409)
  PASS E22   잘못된 비밀번호 로그인                   (401)
  PASS E23   로그인 (세션 쿠키 발급)                  (200)
  PASS E24   쿠키 HttpOnly 속성                       (yes)
[4] 챗 파이프라인 + 컨텍스트
  PASS E30   질문 1 '배포 방법 알려줘 (고유 태그)'    (200)
  PASS E31   질문 2 컨텍스트 반영                     (yes)
[5] 입력 검증
  PASS E40   빈 입력(공백) 차단                       (400)
  PASS E41   1001자 입력 차단                         (400)
[6] AI 장애 상황 (DEMO_MODE 시뮬레이션)
  PASS E50   AI_ERROR → 503                           (503)
  PASS E51   오류 코드 AI_ERROR 반환                  (yes)
  PASS E52   AI_TIMEOUT → 503 (AI_TIMEOUT 초 대기)    (503)
  PASS E53   장애 후에도 서버 정상                    (200)
[7] 로그 조회 / 사용자 격리
  PASS E60   내 로그 조회                             (200)
  PASS E61   내 로그 4건(성공2+실패2)                 (4)
  PASS E62   데모 계정 로그인                         (200)
  PASS E63   타 사용자 질문 미노출                    (no)
[8] 로그아웃
  PASS E70   로그아웃                                 (204)
  PASS E71   이전 쿠키 재사용 차단                    (401)
  PASS E72   외부 Origin POST 차단                    (403)
== RESULT: PASS=24 FAIL=0
```
환경 B: `INSECURE=1 BASE=https://localhost:8443 … e2e_flow.sh` → `== RESULT: PASS=24 FAIL=0`

관리자 추가 후 (`ADMIN_PASSWORD` 지정):
```
[7-2] 관리자 조회 (ADMIN_PASSWORD 지정 시)
  PASS E80   일반 사용자 관리자 API 차단              (403)
  PASS E81   관리자 로그인                            (200)
  PASS E82   관리자 사용자 목록에 신규 사용자         (1)
  PASS E83   관리자가 신규 사용자 대화 4건 조회       (4)
== RESULT: PASS=28 FAIL=0
```

---

## 3. L3 — 브라우저 UI (Playwright, 13 테스트 × 3 브라우저 = 39)

테스트 코드가 **자체 헤드리스 브라우저**에서 실제 사용자처럼 클릭·입력한다. 모바일은 375/400px 뷰포트(Chromium·WebKit 은 `isMobile` 에뮬레이션).

| ID | 사용자 행동 | 기대 결과 | Chromium | Firefox | WebKit |
|----|-------------|-----------|:--:|:--:|:--:|
| B01 | 비로그인으로 `/chat` | `/login` 이동, 게스트 메뉴만 | ✅ | ✅ | ✅ |
| B02 | 빈 폼 로그인 | `400 아이디와 비밀번호를 모두 입력해 주세요.`, **네트워크 요청 없음** | ✅ | ✅ | ✅ |
| B03 | 회원가입 | `/login` 이동 + "가입이 완료되었습니다" + 아이디 자동 입력 | ✅ | ✅ | ✅ |
| B04 | 같은 아이디 재가입 | `409 이미 사용 중인 아이디입니다.` | ✅ | ✅ | ✅ |
| B05 | 틀린 비밀번호 | `401 …올바르지 않습니다.`, 비밀번호 칸 비움 | ✅ | ✅ | ✅ |
| B06 | 데모 계정 로그인 | `/chat`, 헤더 탭·사용자명, 환영 말풍선 | ✅ | ✅ | ✅ |
| B07 | 질문 Enter 전송 | 사용자 말풍선 즉시 → 봇 말풍선, 서버 로그 패널 4종 이벤트 | ✅ | ✅ | ✅ |
| B08 | "내가 방금 뭘 물어봤지?" | 답변에 직전 질문 포함 | ✅ | ✅ | ✅ |
| B09 | 한글 조합 중 Enter (`isComposing=true`) | 전송 안 됨, 조합 끝난 Enter 는 1회만 전송 | ✅ | ✅ | ✅ |
| B10 | 공백만 입력 | 전송 버튼 비활성 | ✅ | ✅ | ✅ |
| B11 | 1200자 입력 | 1000자에서 잘림, `1000 / 1000` 주황 | ✅ | ✅ | ✅ |
| B12 | 시뮬레이션 AI_TIMEOUT | 로딩 점 → 15초 후 `503 · AI_TIMEOUT` 주황 말풍선, 서버 로그 `ai_call_failed` | ✅ | – ¹ | – ¹ |
| B13 | 시뮬레이션 AI_ERROR | `503 · AI_ERROR` 말풍선, 입력창 포커스 복귀 | ✅ | ✅ | ✅ |
| B14 | 정상 응답으로 복귀 후 전송 | 정상 답변 (서비스 유지) | ✅ | ✅ | ✅ |
| B15 | 새로고침 | 로그인 유지, 실패 포함 이전 대화 복원 | ✅ | ✅ | ✅ |
| B16 | 내 대화 로그 | 카드 수 = 질문 수, 오류 태그, 총 기록 | ✅ | ✅ | ✅ |
| B17 | 새 계정의 로그 화면 | "아직 저장된 대화가 없습니다.", 총 기록 0 | ✅ | ✅ | ✅ |
| B18 | 로그 화면 → 로그아웃 → 뒤로가기 | `/login` 유지 (보호 페이지 재진입 차단) | ✅ | ✅ | ✅ |
| B19 | 375px·400px 폭 | **가로 스크롤 0**, 사이드 패널이 챗 아래, 로그 1열 | ✅ | ✅ | ✅ |
| B20 | 프록시 502 / 네트워크 단절 | `502 · SERVER_UNREACHABLE` "서버에 연결할 수 없습니다", `NETWORK · NETWORK_ERROR` + "연결 끊김", 복구 후 정상 | ✅ | ✅ | ✅ |
| B21 | 쿠키 속성 | `chatlog_session` HttpOnly ✓ SameSite=Lax (환경 B: Secure ✓ — N05) | ✅ | ✅ | ✅ |
| B22 | `/api/chat` 응답 | `X-Request-ID` 존재, 본문에 키 없음 | ✅ | ✅ | ✅ |
| B23 | 사용 중 세션 소실 | 로그인 화면으로 이동 | ✅ | ✅ | ✅ |
| B24 | 일반 사용자 | "관리자" 탭 없음, `/admin` 직접 입력 → `/chat` | ✅ | ✅ | ✅ |
| B25 | 관리자: 탭 → 통계 → 검색 → 사용자 선택 | 목록 1명·"대화 3 실패 1" → `?user=id`, 대화 카드 3·오류 태그 1, 실패 필터 1건, 새로고침 후 선택 유지 | ✅ | ✅ | ✅ |
| B26 | 관리자 화면 400px | 가로 스크롤 0, 목록 위·대화 아래 1열 | ✅ | ✅ | ✅ |

¹ 15초 대기 테스트라 Chromium 에서만 실행 (타임아웃 처리는 서버 로직이라 브라우저 무관, L1·L2 에서 검증)

```
$ BASE=http://127.0.0.1:5173 DEMO_PASSWORD=… e2e/.venv/bin/python -m pytest e2e -v
… (39 PASSED)
======================== 39 passed in 105.23s (0:01:45) ========================

$ BASE=https://localhost:8443 DEMO_PASSWORD=… e2e/.venv/bin/python -m pytest e2e -q
39 passed in 104.45s (0:01:44)

# 관리자 추가 후
$ BASE=http://127.0.0.1:5173 DEMO_PASSWORD=… ADMIN_PASSWORD=… e2e/.venv/bin/python -m pytest e2e -q
48 passed in 135.52s (0:02:15)
```

화면 캡처 (Chromium, 테스트 중 자동 저장): `docs/screenshots/`
| 파일 | 화면 |
|------|------|
| `01-signup-done.png` | 가입 완료 후 로그인 화면 |
| `02-chat-context.png` | 컨텍스트 유지 대화 + 서버 로그 패널 |
| `03-chat-errors.png` | AI_ERROR / AI_TIMEOUT 오류 말풍선 |
| `04-logs.png` | 내 대화 로그 (성공·실패 카드) |
| `05-logs-empty.png` | 새 계정 빈 로그 |
| `06-mobile-chat.png` | 400px 챗 |
| `07-mobile-logs.png` | 400px 로그 |
| `08-admin.png` | 관리자: 통계·사용자 목록·사용자별 대화 |
| `09-admin-mobile.png` | 400px 관리자 |

---

## 4. L4 — 운영 구성 재현 (로컬 Nginx + HTTPS)

### 4-1. 리버스 프록시 / 보안 설정
| ID | 확인 | 결과 |
|----|------|------|
| N01 | `http://localhost:8080/chat` | `301 → https://localhost:8443/chat` ✅ |
| N02 | `https://…/api/health` (Nginx 경유) | `200 {"status":"ok","db":"ok"}` ✅ |
| N03 | `/chat`, `/logs` 직접 접속(새로고침) | `200 text/html` (SPA fallback) ✅ |
| N04 | 보안 헤더 | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` ✅ |
| N05 | 로그인 쿠키 | `HttpOnly; Max-Age=86400; Path=/; SameSite=lax; Secure` ✅ |
| N06 | 같은 출처 POST (프록시 뒤) | `200` ✅ |
| N07 | 외부 Origin POST | `403 FORBIDDEN_ORIGIN` ✅ |
| N08 | 64KB 초과 본문 | `413` (Nginx 에서 차단, 백엔드 미도달) ✅ |

### 4-2. 백엔드 프로세스 실제 중단
| ID | 확인 | 결과 |
|----|------|------|
| R01 | Vite 프록시, 백엔드 중단 → `/api/health` | `502` ✅ |
| R02 | Vite 프록시, 백엔드 중단 → `POST /api/chat` | `502` ✅ |
| R03 | 프론트 페이지 | `200` (계속 서빙) ✅ |
| R04 | Nginx, 백엔드 중단 → `/api/health` | `502` ✅ |
| R05 | Nginx 정적 `/chat` | `200` (계속 서빙) ✅ |
| R06 | 브라우저: 중단 상태로 접속·로그인 | `/login` 으로 이동, 푸터 "연결 실패", 로그인 시 오류 표시 ✅ |

---

## 5. L5 — 데이터 / 로그 증빙

### 5-1. 정상 요청 1건
```
$ grep 5d14c34e071f backend/logs/app.log
2026-09-14 11:44:11 INFO  request_received method=POST path=/api/chat request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  chat_request user_id=5 length=13 request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  ai_call_start user_id=5 provider=mock context_turns=1 request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  ai_call_success user_id=5 latency_ms=402 request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  db_save_success user_id=5 chat_id=2 status=success request_id=5d14c34e071f
2026-09-14 11:44:11 INFO  request_completed status=200 duration_ms=412 request_id=5d14c34e071f
```

### 5-2. 타임아웃 1건
```
$ grep 351990af2cf2 backend/logs/app.log
2026-09-14 11:44:12 INFO  request_received method=POST path=/api/chat request_id=351990af2cf2
2026-09-14 11:44:12 INFO  chat_request user_id=5 length=8 request_id=351990af2cf2
2026-09-14 11:44:12 INFO  ai_call_start user_id=5 provider=simulate context_turns=2 request_id=351990af2cf2
2026-09-14 11:44:27 WARNING ai_call_failed user_id=5 error=AI_TIMEOUT detail=exceeded_15.0s latency_ms=15000 request_id=351990af2cf2
2026-09-14 11:44:27 INFO  db_save_success user_id=5 chat_id=4 status=error request_id=351990af2cf2
2026-09-14 11:44:27 INFO  request_completed status=503 duration_ms=15007 request_id=351990af2cf2
```

### 5-3. DB 누적 저장 (`check_logs.sql` 발췌)
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

---

## 6. 검증 중 발견·수정한 문제

| # | 발견 단계 | 문제 | 원인 | 조치 | 회귀 방지 |
|---|-----------|------|------|------|-----------|
| 1 | L3 B20 | **챗 진입 직후 전송한 메시지·오류 말풍선이 사라짐** | 늦게 도착한 "이전 대화 복원" 응답이 `setMessages(restored)` 로 현재 메시지를 덮어씀 | 복원 결과를 현재 메시지 **앞에 병합** | B20 (진입 즉시 전송) |
| 2 | L3 B12 | 개발 모드에서 새로고침 시 대화가 **2배로 중복** | React StrictMode 의 effect 이중 실행 + #1 병합 | effect cleanup 의 `ignore` 플래그로 이전 실행 응답 폐기 | B15 (새로고침 후 개수 일치) |
| 3 | L4 R06 | 백엔드 중단 시 "502 요청을 처리하지 못했습니다" — 원인 불명확 | JSON 없는 게이트웨이 오류를 일반 오류로 처리 | 502/503/504 + 본문 없음 → `SERVER_UNREACHABLE` "서버에 연결할 수 없습니다" | B20 |
| 4 | 캡처 검토 | 서버 로그 패널 `WARNING` 이 `WARNIN/G` 로 줄바꿈 | 레벨 칸 고정폭 44px | `min-width` + `nowrap` | `03-chat-errors.png` |
| 5 | 캡처 검토 | 모바일 헤더에서 로그아웃이 탭보다 앞 | flex `order` 지정 누락 | 탭 order 2, 사용자 order 3 | `06-mobile-chat.png` |
| 6 | L4 N06 | 비표준 포트에서 Nginx `$host` 가 포트를 제거 → Origin 같은 호스트 판정이 허용 목록에만 의존 | `$host` 는 포트 미포함 | `deploy/nginx/chatlog.conf` → `proxy_set_header Host $http_host` | N06 |
| 7 | L2 | E2E 스크립트: JSON 이 `{a,b}` brace expansion 으로 분해 | bash 확장 규칙 | 본문을 변수로 선생성 | – |
| 8 | L2 | E2E 스크립트: macOS bash 3.2 에서 `set -u` + 빈 배열 → 전체 실패, 동시 실행 시 임시파일·아이디 충돌 | 쉘 호환성 | `${arr[@]+…}`, `mktemp`, 사용자명에 PID | – |
| 9 | L2 E63 | 격리 검사 오판 (tester 기록에 같은 문장 존재) | Playwright 가 tester 로 같은 질문을 보냄 (**격리 버그 아님**, DB 로 확인) | 실행별 고유 질문 사용 | E63 |

---

## 7. 아직 검증하지 않은 항목

| 항목 | 이유 | 방법 |
|------|------|------|
| **실제 Claude API 호출** (정상·실제 타임아웃·잘못된 키·fallbacks 파라미터) | API 크레딧 필요 | 키 입력 후 §8 |
| 관리자 기능의 로컬 Nginx(HTTPS) 환경 재검증 | 관리자 추가 후 개발 서버에서만 실행 (L2 28/28, L3 48/48) | 환경 B 로 L2·L3 재실행 |
| 실제 클라우드 VM 배포 · 외부 네트워크 접속 | VM/도메인 없음 (로컬 Nginx 로 구성은 재현) | docs/06 §4, 외부망에서 L2·L3 `BASE=https://<도메인>` |
| systemd 자동 재시작 (`Restart=always`) | macOS 에 systemd 없음 | VM 에서 `sudo kill -9 <uvicorn pid>` 후 `systemctl status chatlog` |
| 공인 인증서(certbot) | 도메인 필요 | `certbot --nginx` 후 N05 재확인 |
| 실제 한글 IME 입력기 | 자동화는 `isComposing` 이벤트로 재현 | 사람이 macOS 한글 입력기로 1회 |
| 실기기 Safari(iOS)·Chrome(Android) | Playwright WebKit/모바일 에뮬레이션으로 대체 | 휴대폰으로 배포 URL 접속 |

## 8. 실제 Claude API 연동 검증 (크레딧 충전 후)

1. `backend/.env` 에 `ANTHROPIC_API_KEY` 입력 → 재시작 → 로그 `app_started ai_provider=anthropic`
2. L2 스크립트 (E31 은 답변에 고유 태그 포함 여부로 판정 — 실제 모델이 문구를 바꿔 말하면 화면에서 의미로 확인)
3. 실제 타임아웃: `AI_TIMEOUT=0.5` 재시작 → 질문 → `ai_call_failed error=AI_TIMEOUT detail=exceeded_0.5s`
4. 실제 API 오류: `ANTHROPIC_API_KEY=invalid` 재시작 → 질문 → `ai_call_failed error=AI_ERROR detail=auth_failed`
5. L3 Playwright `-k "b06 or b12"` 로 실제 응답 화면 확인
