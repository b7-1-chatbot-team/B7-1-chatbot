# 06. 설치 · 실행 · 배포

> 관련 문서: [02-architecture.md](02-architecture.md) · [03-api.md](03-api.md)
> 배포 플랫폼: **Railway** — 한 프로젝트에 서비스 2개(백엔드·프론트), 서비스마다 별도 도메인

## 1. 요구 환경

- Python 3.11+
- Node.js 24 LTS (`frontend/.nvmrc` 로 고정 — `nvm use`)
- sqlite3 CLI (DB 확인용)

## 2. 설치

### 백엔드

`backend/requirements.txt` (목표 구성 — 현재 파일과의 차이는 [11-open-issues.md](11-open-issues.md) E9·E10)

```
fastapi
uvicorn[standard]
sqlalchemy
pydantic[email]
pydantic-settings
python-dotenv
bcrypt
pyjwt
httpx
```

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # 값 입력 (§3)
uvicorn app.main:app --reload
# → http://localhost:8000  ·  Swagger: http://localhost:8000/docs
```

### 프론트엔드

```bash
cd frontend
nvm use                     # Node 24
npm install                 # react · react-router-dom · axios (스타일은 CSS Modules, 설치 없음)
cp .env.example .env
npm run dev
# → http://localhost:5173
```

## 3. 환경변수

### `backend/.env` (`.env.example` 을 복사해서 사용)

**`.env` 는 절대 커밋하지 않는다.** 저장소에는 값이 비어 있는 `.env.example` 만 둔다.

```
COPA_API_KEY=
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=1
DATABASE_URL=sqlite:///./data/app.db
AI_TIMEOUT_SECONDS=30
AI_CONTEXT_TURNS=5
MAX_MESSAGE_LENGTH=1000
CORS_ORIGINS=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_NICKNAME=
```

| 키 | 기본값 | 설명 | 민감 |
|----|--------|------|:----:|
| `COPA_API_KEY` | (없음) | Codyssey AI API 키 — **서버에서만 사용** | ✅ |
| `JWT_SECRET_KEY` | (없음) | JWT 서명 키. 충분히 긴 난수 (`python -c "import secrets;print(secrets.token_urlsafe(48))"`) | ✅ |
| `JWT_ALGORITHM` | `HS256` | 서명 알고리즘. 디코드 시에도 이 값으로 **고정** | |
| `JWT_EXPIRE_MINUTES` | `15` | access token 만료(분). 응답 `expires_in` = ×60 | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `1` | refresh token 만료(일). 응답 `refresh_expires_in` = ×86400 | |
| `DATABASE_URL` | `sqlite:///./data/app.db` | SQLAlchemy URL. Railway 는 `sqlite:////data/app.db` (§6-1) | |
| `AI_TIMEOUT_SECONDS` | `30` | AI API 호출 전체 대기 상한(초) | |
| `AI_CONTEXT_TURNS` | `5` | 프롬프트에 포함할 최근 성공 Q/A 수 | |
| `MAX_MESSAGE_LENGTH` | `1000` | 질문 최대 글자수 | |
| `CORS_ORIGINS` | (없음) | 허용 Origin, 쉼표 구분. 예: `http://localhost:5173,https://<프론트>.up.railway.app` | |
| `ADMIN_EMAIL` | (없음) | 서버 시작 시 생성(또는 `role=admin` 승격)할 관리자 이메일 | |
| `ADMIN_PASSWORD` | (없음) | 관리자 비밀번호 (8자 이상) | ✅ |
| `ADMIN_NICKNAME` | (없음) | 관리자 닉네임 | |

### `frontend/.env`

```
VITE_API_BASE_URL=http://localhost:8000
```

> **프론트 `.env` 에는 비밀값을 절대 넣지 않는다.** `VITE_` 접두어 변수는 빌드 결과물에 그대로 포함되어 브라우저에서 볼 수 있다. AI API 키(`COPA_API_KEY`)는 백엔드에만 둔다.
> `VITE_` 변수는 **빌드 시점**에 박히므로, 값을 바꾸면 프론트를 다시 빌드·배포해야 한다.

## 4. 로컬 실행 확인

응답은 항상 HTTP 200 + `{code, data}` 이므로 **body 의 `code` 를 확인**한다 ([03-api.md](03-api.md) §0).

```bash
# 1) 백엔드
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# 2) 프론트 (새 터미널)
cd frontend && npm run dev

# 3) API 확인
curl -s -X POST http://localhost:8000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234","nickname":"어썸체크"}'
# {"code":201,"data":{...}}

TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["access_token"])')

curl -s -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"FastAPI에서 CORS 설정은 어떻게 해?"}'

curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:8000/api/me/chats?limit=20&offset=0'
```

## 5. CORS 설정

프론트와 백엔드가 **Railway 에서 서로 다른 도메인**으로 배포되므로 CORS 가 필수다. 설정이 없으면 브라우저가 API 응답을 차단한다 (curl 은 CORS 와 무관하게 성공하므로 브라우저로 확인해야 한다).

```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,   # 개발 서버 + Railway 프론트 도메인
    allow_credentials=False,                    # JWT 헤더 방식이라 쿠키 불필요
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

- 개발: `http://localhost:5173`, `http://127.0.0.1:5173`
- 배포: `https://<프론트 서비스>.up.railway.app` (커스텀 도메인을 붙이면 그 도메인도 추가)
- `allow_origins=["*"]` 는 쓰지 않는다.
- Origin 값은 **끝에 `/` 없이** 정확히 일치해야 한다.

## 6. 배포 — Railway

한 Railway 프로젝트에 GitHub 저장소(`b7-1-chatbot-team/B7-1-chatbot`)를 연결하고, **Root Directory 가 다른 서비스 2개**를 만든다.

```
Railway Project
 ├─ backend  (Root /backend)   → https://<backend>.up.railway.app   + Volume /data
 └─ frontend (Root /frontend)  → https://<frontend>.up.railway.app
```

> GitHub 조직 저장소는 **조직에 Railway GitHub App 을 설치**해야 레포 목록에 나타난다 (조직 설정 → GitHub Apps).

### 6-1. 백엔드 서비스

| 항목 | 값 |
|------|-----|
| Root Directory | `/backend` |
| Build | Railpack 자동 감지 (`requirements.txt` 로 설치) |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (현재 코드처럼 `backend/main.py` 단일 파일이면 `main:app`) |
| Volume | 마운트 경로 `/data` |
| 도메인 | Settings → Networking → **Generate Domain** (프론트가 브라우저에서 직접 호출하므로 공개 도메인 필요) |
| 배포 브랜치 | `main` (평가 배포 기준. 개발 확인용으로 develop 을 연결할지는 팀 결정) |

**Variables**: §3 의 키를 모두 등록 (`.env` 파일 업로드 금지). 배포 시 달라지는 값:

| 키 | 값 |
|----|-----|
| `DATABASE_URL` | `sqlite:////data/app.db` |
| `CORS_ORIGINS` | `https://<frontend>.up.railway.app` |

### 6-2. 프론트 서비스

| 항목 | 값 |
|------|-----|
| Root Directory | `/frontend` |
| Build | Railpack 자동 감지 (Node 버전은 `.nvmrc`·`engines`, `npm run build` → `dist`) |
| 도메인 | **Generate Domain** |
| Variables | `VITE_API_BASE_URL=https://<backend>.up.railway.app` |

체크 포인트
- SPA 라우팅: `/chat`, `/admin` 에서 **새로고침했을 때 404 가 나지 않는지** 확인. 404 가 나면 정적 서빙에 `index.html` fallback 설정을 추가한다 (첫 배포 빌드 로그로 서빙 방식 확인).

### 6-3. 배포 순서

1. 백엔드 서비스 배포 → Volume 연결 → Generate Domain → 백엔드 URL 확보
2. 프론트 서비스 Variables 에 `VITE_API_BASE_URL` = 백엔드 URL → 배포 → Generate Domain → 프론트 URL 확보
3. 백엔드 Variables `CORS_ORIGINS` 에 프론트 URL 추가 → **백엔드 재배포**
4. 브라우저로 프론트 URL 접속 → 개발자도구 Console 에 CORS 오류가 없는지 확인 (§7)
5. README 의 서비스 URL 칸에 프론트 URL 기입

### 6-4. 슬리핑(Serverless)

- Railway 의 Serverless(슬리핑)를 켜면 트래픽이 없을 때 서비스가 잠들고, **첫 요청이 늦거나 실패(502)** 할 수 있다.
- 개발 중에는 비용 절감용으로 켜도 되지만, **평가 전에는 끈다.**
- 잠든 동안에는 만료 refresh token 정리 스케줄러(하루 1회)도 멈춘다. 깨어나면 시작 시 정리가 실행된다.

## 7. 외부 접속 · CORS 검증 (평가 전 필수)

```bash
# 서버 밖(다른 네트워크, 휴대폰 핫스팟 등)에서
curl -s https://<backend>.up.railway.app/docs -o /dev/null -w '%{http_code}\n'      # 200

# CORS preflight — 허용 Origin
curl -si -X OPTIONS https://<backend>.up.railway.app/api/auth/login \
  -H 'Origin: https://<frontend>.up.railway.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type,authorization' | grep -i '^access-control-allow'
# access-control-allow-origin: https://<frontend>.up.railway.app 가 보여야 함

# CORS preflight — 허용되지 않은 Origin
curl -si -X OPTIONS https://<backend>.up.railway.app/api/auth/login \
  -H 'Origin: https://evil.example.com' \
  -H 'Access-Control-Request-Method: POST' | grep -i '^access-control-allow-origin'
# 출력 없어야 함
```

브라우저로 `https://<frontend>.up.railway.app` 접속 → 가입 → 로그인 → 질문 → 응답 → 로그 조회 → (관리자) 관리자 화면까지 전 흐름 재현, Console 에 CORS 오류 없음.

## 8. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-------------|
| 백엔드 배포 후 `ModuleNotFoundError` | `requirements.txt` 에 패키지 누락 (예: `python-dotenv`) → 추가 후 재배포 |
| 브라우저 콘솔에 CORS 오류 | 백엔드에 `CORSMiddleware` 없음 / `CORS_ORIGINS` 에 실제 프론트 도메인 누락·끝 `/` 포함 → 수정 후 백엔드 재배포 |
| 프론트가 `localhost:8000` 을 호출함 | `VITE_API_BASE_URL` 미설정 상태로 빌드됨 → 프론트 Variables 설정 후 **재빌드** |
| 첫 요청이 느리거나 502 | Serverless 슬리핑에서 깨어나는 중. 평가 전 슬리핑 끄기 |
| 재배포 후 계정이 사라짐 | SQLite 가 Volume 밖에 있음 → Volume `/data` 연결 + `DATABASE_URL=sqlite:////data/app.db` |
| 서비스가 뜨지만 접속 안 됨 | Start Command 에 `--host 0.0.0.0 --port $PORT` 누락 |
| 로그인은 되는데 이후 요청이 `code: 401` | axios 인터셉터가 `Authorization` 헤더를 붙이지 않음 / 토큰 저장 키 불일치 |
| 하루 넘게 쓰지 않은 뒤 로그인 화면으로 이동 | 정상 (refresh token 1일 만료) |
| 15분마다 로그인 화면으로 튕김 | refresh 재발급 실패 — 인터셉터가 refresh 를 호출하는지, `refresh_tokens` 에 행이 있는지, 서버 재배포로 DB 가 초기화됐는지(Volume) 확인 |
| 로그아웃 후에도 잠시 API 호출이 됨 | 정상. access token 은 `exp` 까지 유효하고, refresh 재발급만 차단된다 |
| 관리자 화면이 `code: 403` | `ADMIN_EMAIL` 이 로그인 계정과 다름 / 시드 후 재시작 안 함 |
| 모든 질문이 `code: 502` | `COPA_API_KEY` 미설정·오류. 로그 `ai_call_failed reason=` 확인 (`auth_failed` / `rate_limited` / `status_5xx`) |
| 가끔 `code: 502` (429) | AI API 호출 제한(rate limit) 초과. 잠시 후 재시도 |
| 응답이 계속 `code: 504` | `AI_TIMEOUT_SECONDS` 가 너무 짧거나 네트워크 지연. 값 조정 후 재배포 |
| `/chat` 새로고침 시 404 | 프론트 정적 서빙 SPA fallback 누락 (§6-2) |

## 9. 민감정보 관리 체크

- `.gitignore` 에 `.env`, `*.db`, `__pycache__`, `node_modules`, `.venv`, `dist`
- 저장소에는 `backend/.env.example`, `frontend/.env.example` 만 (키 이름 수준, 값 없음)
- API 키·JWT 비밀키·관리자 비밀번호는 Railway Variables 에만 입력

```bash
git ls-files | grep -E '(^|/)\.env$'                 # 출력 없어야 함
git grep -n "COPA_API_KEY=."                         # 출력 없어야 함 (추적 파일에 키 값 없음)
```
