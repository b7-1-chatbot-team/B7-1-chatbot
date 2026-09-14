# 03. API 명세

> 관련 문서: [02-architecture.md](02-architecture.md) · [04-database.md](04-database.md)
> API 계약의 기준 문서다. 합의가 필요한 값은 §6, 문서 간 불일치는 [11-open-issues.md](11-open-issues.md) 에서 관리한다.

## 0. 공통 규약

### Base URL

| 환경 | URL |
|------|-----|
| 개발(백엔드 직접) | `http://localhost:8000` |
| 개발(프론트) | `http://localhost:5173` — axios `baseURL` 은 `VITE_API_BASE_URL` |
| 배포 | `https://<Render 백엔드 주소>` |

- 요청/응답 본문: `application/json`
- Swagger UI: `<Base URL>/docs`

### 인증 방식

**JWT Bearer 토큰.** 로그인 성공 시 발급받은 `access_token` 을 이후 요청 헤더에 포함한다.

```
Authorization: Bearer <access_token>
```

- 서명 알고리즘 `HS256` (`JWT_ALGORITHM`), 비밀키 `JWT_SECRET_KEY`
- 만료 `JWT_EXPIRE_MINUTES` (초안: 60분) → 응답의 `expires_in` 은 초 단위(3600)
- 서버는 토큰 상태를 저장하지 않는다. **로그아웃은 클라이언트가 토큰을 삭제**하는 것으로 처리하며 별도 API 가 없다.
- 만료·위조·누락은 모두 `401 UNAUTHORIZED`

### 공통 에러 응답 형식

모든 에러는 아래 형태로 통일한다. 프론트는 `error.code` 로 분기한다.

```json
{
  "error": {
    "code": "AI_TIMEOUT",
    "message": "현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요."
  }
}
```

### 에러 코드 목록

| code | HTTP | 발생 상황 |
|---|---|---|
| `VALIDATION_ERROR` | 422 | 입력값 검증 실패 (빈 입력, 길이 초과, 이메일 형식 등) |
| `EMAIL_ALREADY_EXISTS` | 409 | 회원가입 시 이메일 중복 |
| `INVALID_CREDENTIALS` | 401 | 로그인 실패 (이메일/비밀번호 불일치) |
| `UNAUTHORIZED` | 401 | 토큰 없음 / 만료 / 위조 |
| `AI_TIMEOUT` | 504 | AI API 타임아웃 |
| `AI_CALL_FAILED` | 502 | AI API 호출 실패 (그 외 오류) |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

> 로그인 실패 메시지는 이메일/비밀번호 중 무엇이 틀렸는지 구분하지 않는다(계정 존재 여부 추측 방지).

## 요약

| Method | Path | 인증 | 설명 | 성공 |
|--------|------|:----:|------|------|
| POST | `/api/auth/signup` | – | 회원가입 | 201 |
| POST | `/api/auth/login` | – | 로그인, JWT 발급 | 200 |
| GET | `/api/auth/me` | ✅ | 현재 사용자 (새로고침 시 상태 복원) | 200 |
| POST | `/api/chat` | ✅ | 질문 → AI 응답 (+DB 저장) | 200 |
| GET | `/api/me/chats` | ✅ | 내 대화 로그 | 200 |

---

## 1. 인증 (담당: 어썸체크 / 팀장)

### 1-1. 회원가입

```
POST /api/auth/signup
```

**Request**
```json
{
  "email": "user@example.com",
  "password": "password1234",
  "nickname": "어썸체크"
}
```

**Response `201 Created`**
```json
{
  "id": 1,
  "email": "user@example.com",
  "nickname": "어썸체크",
  "created_at": "2026-09-14T10:00:00+09:00"
}
```

**검증 규칙**

| 필드 | 규칙 |
|------|------|
| `email` | 이메일 형식(Pydantic `EmailStr`), 중복 불가 |
| `password` | 최소 8자 이상 |
| `nickname` | 1~20자 |

- 비밀번호는 **bcrypt 로 해싱해서 저장** (평문 저장 금지). 응답에 해시를 포함하지 않는다.

**에러**: `VALIDATION_ERROR`(422), `EMAIL_ALREADY_EXISTS`(409)

```bash
curl -i -X POST http://localhost:8000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234","nickname":"어썸체크"}'
```
```json
409 {"error":{"code":"EMAIL_ALREADY_EXISTS","message":"이미 가입된 이메일입니다."}}
422 {"error":{"code":"VALIDATION_ERROR","message":"비밀번호는 8자 이상으로 입력해 주세요."}}
```

---

### 1-2. 로그인

```
POST /api/auth/login
```

**Request**
```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

**Response `200 OK`**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

| 필드 | 의미 |
|------|------|
| `access_token` | JWT. payload 에 `sub`(user_id), `exp` 포함 |
| `token_type` | 항상 `bearer` |
| `expires_in` | 만료까지 남은 초. `JWT_EXPIRE_MINUTES × 60` |

**에러**: `VALIDATION_ERROR`(422), `INVALID_CREDENTIALS`(401)

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234"}'
```
```json
401 {"error":{"code":"INVALID_CREDENTIALS","message":"이메일 또는 비밀번호가 올바르지 않습니다."}}
```

---

### 1-3. 내 정보 조회

> 프론트가 새로고침 후 로그인 상태를 복원할 때 사용한다.

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response `200 OK`**
```json
{
  "id": 1,
  "email": "user@example.com",
  "nickname": "어썸체크"
}
```

**에러**: `UNAUTHORIZED`(401)

```json
401 {"error":{"code":"UNAUTHORIZED","message":"로그인이 필요합니다."}}
```

---

### 1-4. 로그아웃 (API 없음)

JWT 는 서버가 상태를 갖지 않으므로 **로그아웃 엔드포인트를 두지 않는다.**
프론트가 저장된 토큰을 삭제하고 인증 상태를 초기화한 뒤 로그인 화면으로 이동한다.
(토큰은 `JWT_EXPIRE_MINUTES` 경과 시 서버에서 거부된다.)

---

## 2. 챗봇 (담당: 박성현A)

### 2-1. 질문 전송

```
POST /api/chat
Authorization: Bearer <token>
```

**Request**

| 필드 | 타입 | 설명 |
|------|------|------|
| `message` | string | 필수. 앞뒤 공백 제거 후 1~`MAX_MESSAGE_LENGTH`(1000)자 |

```json
{
  "message": "FastAPI에서 CORS 설정은 어떻게 해?"
}
```

**Response `200 OK`**
```json
{
  "chat_id": 987,
  "question": "FastAPI에서 CORS 설정은 어떻게 해?",
  "answer": "FastAPI에서는 CORSMiddleware를 사용합니다...",
  "created_at": "2026-09-14T10:05:12+09:00"
}
```

**동작 흐름**

1. 인증 확인 (비로그인 시 `UNAUTHORIZED`)
2. 입력 검증 (빈 문자열·공백만 차단, 최대 길이 1000자) — **AI 호출 이전에 수행**
3. 해당 사용자의 최근 N개 대화를 DB 에서 조회 → 컨텍스트 구성
4. Codyssey AI API 호출 (`httpx`, 타임아웃 `AI_TIMEOUT_SECONDS`)
5. 응답 수신 → `chat_logs` 에 질문/응답 저장
6. 결과 반환

**컨텍스트 유지 정책**

- 같은 사용자의 최근 `AI_CONTEXT_TURNS`(초안: 5)개 Q/A 쌍을 프롬프트에 포함한다.
- 토큰 초과 방지를 위해 **오래된 것부터** 잘라낸다.
- 조회는 항상 `WHERE user_id = <토큰의 사용자>` 로 강제한다. 클라이언트가 보낸 user_id 는 사용하지 않는다.

**에러**: `UNAUTHORIZED`(401), `VALIDATION_ERROR`(422), `AI_TIMEOUT`(504), `AI_CALL_FAILED`(502)

```json
422 {"error":{"code":"VALIDATION_ERROR","message":"질문은 1~1000자로 입력해 주세요."}}
504 {"error":{"code":"AI_TIMEOUT","message":"현재 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요."}}
502 {"error":{"code":"AI_CALL_FAILED","message":"AI 응답을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요."}}
```

> **AI 호출이 실패해도 서버는 종료되지 않고 위 에러 응답을 반환해야 한다.**
> 타임아웃/실패 이후에 보낸 정상 질문은 계속 200 으로 처리되어야 한다.

---

## 3. 대화 로그 (담당: 어썸체크 / 팀장)

### 3-1. 내 대화 로그 조회

```
GET /api/me/chats?limit=20&offset=0
Authorization: Bearer <token>
```

**Query Parameters**

| 이름 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `limit` | int | 20 | 조회 개수 (최대 100) |
| `offset` | int | 0 | 시작 위치 |

**Response `200 OK`**
```json
{
  "total": 42,
  "items": [
    {
      "chat_id": 987,
      "question": "FastAPI에서 CORS 설정은 어떻게 해?",
      "answer": "FastAPI에서는 CORSMiddleware를 사용합니다...",
      "created_at": "2026-09-14T10:05:12+09:00"
    }
  ]
}
```

| 필드 | 의미 |
|------|------|
| `total` | 해당 사용자의 전체 기록 수 (페이지네이션용) |
| `items` | 최신순 정렬 |

**에러**: `UNAUTHORIZED`(401)

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -H "Authorization: Bearer $TOKEN" 'http://localhost:8000/api/me/chats?limit=20&offset=0'
```

> 이 엔드포인트가 평가지의 **"사용자 기준 대화 로그 조회/추적"** 항목을 충족한다.

---

## 4. 연관 DB 스키마 (참고)

API 응답 형태와 직결되므로 함께 정리한다. 상세는 [04-database.md](04-database.md).

### `users`

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | INTEGER PK | 사용자 식별자 |
| `email` | TEXT UNIQUE | 로그인 ID |
| `hashed_password` | TEXT | 해싱된 비밀번호 (bcrypt) |
| `nickname` | TEXT | 표시 이름 |
| `created_at` | DATETIME | 가입 시각 |

### `chat_logs`

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | INTEGER PK | 대화 식별자 (응답에서는 `chat_id`) |
| `user_id` | INTEGER FK → users.id | 사용자 식별 |
| `question` | TEXT | 사용자 질문 |
| `answer` | TEXT | AI 응답 |
| `created_at` | DATETIME | 생성 시각 |

> 평가지 최소 추적 필드(사용자 / 시간 / 질문 / 응답)를 모두 포함한다.

---

## 5. 서버 로그 이벤트 규약

세 트랙이 같은 포맷으로 로그를 남긴다.

```
INFO  request_received   user_id=12 path=/api/chat
INFO  ai_call_start      user_id=12 request_id=abc123
INFO  ai_call_success    request_id=abc123 latency_ms=1240
ERROR ai_call_failed     request_id=abc123 reason=timeout
INFO  db_save_success    user_id=12 chat_id=987
ERROR db_save_failed     user_id=12 reason=...
```

- 질문 원문·비밀번호·API 키는 로그에 남기지 않는다.
- `request_id` 로 한 요청의 흐름을 이어서 추적한다.

---

## 6. 확정 전 합의가 필요한 항목

확정되면 이 표와 관련 문서를 함께 갱신한다. 문서 간 불일치 목록은 [11-open-issues.md](11-open-issues.md) 참고.

| 항목 | 초안 값 | 상태 |
|------|---------|------|
| JWT 만료 시간 | 1시간 (`JWT_EXPIRE_MINUTES=60`) | 합의 필요 |
| 컨텍스트 유지 개수 N | 5 (`AI_CONTEXT_TURNS=5`) | 합의 필요 |
| AI API 타임아웃 | 30초 (`AI_TIMEOUT_SECONDS=30`) | 합의 필요 |
| 질문 최대 길이 | 1000자 (`MAX_MESSAGE_LENGTH=1000`) | 합의 필요 |
| 사용할 AI API 제공자 | **Codyssey AI API (COPA)** | 확정 |
| 토큰 저장 위치 | localStorage vs 메모리 | **프론트(이성준) 결정** |
| React 빌드 서빙 방식 | **Vercel 별도 배포** (FastAPI 서빙 안 함) | 배포 방식 미확정 — [11-open-issues.md](11-open-issues.md) |
