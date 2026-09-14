# 03. API 명세

- Base: 개발 `http://127.0.0.1:5173/api` (Vite 프록시) · 백엔드 직접 `http://127.0.0.1:8000/api` · 운영 `https://<도메인>/api`
- 요청/응답 본문: `application/json`
- 인증: 로그인 시 발급되는 `chatlog_session` 쿠키 (HttpOnly). curl 은 `-c/-b cookie.txt`
- 모든 응답 헤더에 `X-Request-ID` (서버 로그의 `request_id=` 와 동일)
- Swagger UI: `http://127.0.0.1:8000/docs`

## 요약

| Method | Path | 인증 | 설명 | 성공 |
|--------|------|:----:|------|------|
| GET | `/api/health` | – | 서버·DB 상태 | 200 |
| GET | `/api/config` | – | 공개 설정(컨텍스트 턴, 최대 길이, 데모 모드) | 200 |
| POST | `/api/auth/signup` | – | 회원가입 | 201 |
| POST | `/api/auth/login` | – | 로그인, 세션 쿠키 발급 | 200 |
| POST | `/api/auth/logout` | – | 세션 삭제, 쿠키 제거 | 204 |
| GET | `/api/auth/me` | ✅ | 현재 사용자 | 200 |
| POST | `/api/chat` | ✅ | 질문 → AI 응답 (+DB 저장) | 200 |
| GET | `/api/me/chats` | ✅ | 내 대화 로그 | 200 |
| GET | `/api/me/server-logs` | ✅ | 내 요청의 서버 로그 (챗 화면 패널) | 200 |
| GET | `/api/admin/stats` | 🔒 admin | 전체 통계 | 200 |
| GET | `/api/admin/users` | 🔒 admin | 사용자 목록 (대화 수·실패 수·최근 활동, 검색) | 200 |
| GET | `/api/admin/users/{user_id}/chats` | 🔒 admin | 특정 사용자 대화 조회 | 200 |

✅ 로그인 필요 · 🔒 admin 역할 필요 (일반 사용자 403)

## 오류 응답 (공통)

```json
{ "error": "AI_TIMEOUT", "message": "현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.", "request_id": "1f3a9c0b7d2e" }
```

| 상태 | error | 발생 상황 |
|------|-------|-----------|
| 400 | `INVALID_INPUT` | 빈 질문/공백, 1000자 초과, 아이디·비밀번호 형식, 운영에서 simulate 사용 |
| 401 | `UNAUTHORIZED` | 쿠키 없음/세션 없음 |
| 401 | `SESSION_EXPIRED` | 세션 만료 |
| 401 | `INVALID_CREDENTIALS` | 로그인 실패 |
| 403 | `FORBIDDEN_ORIGIN` | 허용되지 않은 Origin 의 POST (CSRF 방어) |
| 403 | `FORBIDDEN` | admin 이 아닌 사용자의 관리자 API 호출 |
| 404 | `USER_NOT_FOUND` | 관리자 대화 조회 대상 사용자 없음 |
| 409 | `USERNAME_TAKEN` | 중복 아이디 |
| 503 | `AI_TIMEOUT` | AI 호출이 `AI_TIMEOUT` 초 초과 |
| 503 | `AI_ERROR` | AI 인증 실패·429·5xx·연결 실패·거절·빈 응답 |
| 503 | `DB_UNAVAILABLE` | health 에서 DB 연결 실패 |
| 500 | `INTERNAL_ERROR` | 처리되지 않은 예외 (로그 `unhandled_error`) |

---

## GET /api/health

```bash
curl -i http://127.0.0.1:8000/api/health
```
```json
200 {"status":"ok","db":"ok"}
```

## GET /api/config
```json
200 {"service_name":"Chatlog","context_turns":5,"max_message_length":1000,"demo_mode":true,"ai_provider":"mock","ai_model":"mock"}
```

## POST /api/auth/signup

| 필드 | 규칙 |
|------|------|
| username | `^[A-Za-z0-9_]{3,30}$` |
| password | 4~72자 (bcrypt 72byte 한계) |

```bash
curl -i -X POST http://127.0.0.1:8000/api/auth/signup \
  -H 'Content-Type: application/json' -d '{"username":"alice","password":"pass1234"}'
```
```json
201 {"id":2,"username":"alice","created_at":"2026-09-14T02:43:29.807150Z"}
409 {"error":"USERNAME_TAKEN","message":"이미 사용 중인 아이디입니다.","request_id":"..."}
400 {"error":"INVALID_INPUT","message":"아이디는 영문·숫자·밑줄(_) 3~30자로 입력해 주세요.","request_id":"..."}
```

## POST /api/auth/login

```bash
curl -i -c cookie.txt -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"tester","password":"<DEMO_PASSWORD>"}'
```
```
HTTP/1.1 200 OK
set-cookie: chatlog_session=Xy...; HttpOnly; Max-Age=86400; Path=/; SameSite=lax

{"id":1,"username":"tester","created_at":"2026-09-14T02:41:11.120000Z"}
```
```json
401 {"error":"INVALID_CREDENTIALS","message":"아이디 또는 비밀번호가 올바르지 않습니다.","request_id":"..."}
```

## POST /api/auth/logout
```bash
curl -i -b cookie.txt -X POST http://127.0.0.1:8000/api/auth/logout   # 204, set-cookie: chatlog_session=""; Max-Age=0
```

## GET /api/auth/me
```json
200 {"id":1,"username":"tester","created_at":"..."}
401 {"error":"UNAUTHORIZED","message":"로그인이 필요합니다.","request_id":"..."}
```

## POST /api/chat

| 필드 | 타입 | 설명 |
|------|------|------|
| message | string | 필수. 앞뒤 공백 제거 후 1~`MAX_MESSAGE_LENGTH`(1000)자 |
| simulate | `"timeout"` \| `"error"` \| null | 선택. `DEMO_MODE=true` 에서만 허용 |

```bash
curl -b cookie.txt -X POST http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' -d '{"message":"배포 방법 알려줘"}'
curl -b cookie.txt -X POST http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' -d '{"message":"내가 방금 뭘 물어봤지?"}'
```
```json
200 {
  "chat_id": 12,
  "answer": "직전에 '배포 방법 알려줘'라고 물어보셨어요. (mock · 컨텍스트 1턴 전달됨)",
  "latency_ms": 402,
  "context_turns": 1,
  "saved": true,
  "request_id": "a81c2f0e9b13",
  "created_at": "2026-09-14T02:44:05.101200Z"
}
```

| 필드 | 의미 |
|------|------|
| context_turns | 이번 AI 호출에 함께 보낸 이전 Q/A 개수 |
| saved | DB 저장 성공 여부 (false 여도 답변은 반환) |

오류:
```json
400 {"error":"INVALID_INPUT","message":"질문은 1~1000자로 입력해 주세요.","request_id":"..."}
401 {"error":"UNAUTHORIZED","message":"로그인이 필요합니다.","request_id":"..."}
503 {"error":"AI_TIMEOUT","message":"현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.","request_id":"..."}
503 {"error":"AI_ERROR","message":"AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.","request_id":"..."}
```

## GET /api/me/chats?limit=50

`limit` 1~200. 세션 사용자 본인 기록만, 최신순.

```bash
curl -b cookie.txt 'http://127.0.0.1:8000/api/me/chats?limit=2'
```
```json
200 {
  "items": [
    {"id":13,"user_id":1,"question":"긴 글 요약해줘","answer":null,"status":"error","error_code":"AI_TIMEOUT",
     "latency_ms":15002,"request_id":"c0ffee123456","created_at":"2026-09-14T02:45:10.000000Z"},
    {"id":12,"user_id":1,"question":"내가 방금 뭘 물어봤지?","answer":"직전에 ...","status":"success","error_code":null,
     "latency_ms":402,"request_id":"a81c2f0e9b13","created_at":"2026-09-14T02:44:05.101200Z"}
  ],
  "count": 13,
  "avg_latency_ms": 405
}
```

## 관리자 API (role=admin)

관리자 계정은 `.env` 의 `ADMIN_USERNAME`/`ADMIN_PASSWORD` 로 서버 시작 시 생성된다. 로그인 방법은 일반 사용자와 같다.
```bash
curl -c admin.txt -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}'
# 200 {"id":150,"username":"admin","role":"admin","created_at":"..."}
```

### GET /api/admin/stats
```json
200 {"users":150,"chats":148,"errors":35,"avg_latency_ms":400}
403 {"error":"FORBIDDEN","message":"관리자만 접근할 수 있습니다.","request_id":"..."}
```

### GET /api/admin/users?q=&limit=50&offset=0
| 파라미터 | 설명 |
|----------|------|
| q | username 부분 검색 (최대 30자) |
| limit | 1~200 (기본 50) |
| offset | 0 이상 |

정렬: 최근 대화 시각 내림차순, 대화 없는 사용자는 뒤.
```bash
curl -b admin.txt 'http://127.0.0.1:8000/api/admin/users?q=trk&limit=2'
```
```json
200 {
  "items": [
    {"id":42,"username":"trk_1a2b3c4d","role":"user","created_at":"2026-09-14T05:10:00Z",
     "chat_count":3,"error_count":1,"last_chat_at":"2026-09-14T05:10:02Z"}
  ],
  "total": 1
}
```

### GET /api/admin/users/{user_id}/chats?status=&limit=50&offset=0
| 파라미터 | 설명 |
|----------|------|
| status | `success` \| `error` \| (생략 = 전체) |
| limit / offset | 위와 동일 |

```bash
curl -b admin.txt 'http://127.0.0.1:8000/api/admin/users/42/chats?status=error'
```
```json
200 {
  "user": {"id":42,"username":"trk_1a2b3c4d","role":"user","created_at":"2026-09-14T05:10:00Z"},
  "items": [
    {"id":301,"user_id":42,"question":"오류 질문","answer":null,"status":"error","error_code":"AI_ERROR",
     "latency_ms":300,"request_id":"9f07e894e269","created_at":"2026-09-14T05:10:02Z"}
  ],
  "count": 1,
  "avg_latency_ms": 401
}
404 {"error":"USER_NOT_FOUND","message":"사용자를 찾을 수 없습니다.","request_id":"..."}
```
감사 로그: `admin_list_users user_id=150 q=trk count=1`, `admin_view_chats user_id=150 target_user_id=42 status=error`

## GET /api/me/server-logs?limit=30
```json
200 [
  {"time":"11:44:05","level":"INFO","line":"request_received method=POST path=/api/chat","request_id":"a81c2f0e9b13"},
  {"time":"11:44:05","level":"INFO","line":"chat_request user_id=1 length=14","request_id":"a81c2f0e9b13"},
  {"time":"11:44:05","level":"INFO","line":"ai_call_start user_id=1 provider=mock context_turns=1","request_id":"a81c2f0e9b13"},
  {"time":"11:44:05","level":"INFO","line":"ai_call_success user_id=1 latency_ms=402","request_id":"a81c2f0e9b13"},
  {"time":"11:44:05","level":"INFO","line":"db_save_success user_id=1 chat_id=12 status=success","request_id":"a81c2f0e9b13"}
]
```
