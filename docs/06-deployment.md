# 06. 설치 · 실행 · 배포

> 기준 문서: [`기술스택_및_아키텍처.md`](../기술스택_및_아키텍처.md) §2 §4 §5

## 1. 요구 환경

- Python 3.11+
- Node.js 20+
- sqlite3 CLI (DB 확인용)

## 2. 설치

### 백엔드

`backend/requirements.txt`

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
pydantic==2.10.4
pydantic-settings==2.7.0
python-dotenv==1.0.1
bcrypt==4.2.1
pyjwt==2.10.1
httpx==0.28.1
python-multipart==0.0.20
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
npm create vite@latest frontend -- --template react
cd frontend
npm install react-router-dom axios
npm install -D tailwindcss @tailwindcss/vite
npm run dev
# → http://localhost:5173
```

## 3. 환경변수

### `backend/.env` (`.env.example` 을 복사해서 사용)

**`.env` 는 절대 커밋하지 않는다.** 저장소에는 값이 비어 있는 `.env.example` 만 둔다.

```
GEMINI_API_KEY=
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./data/app.db
AI_TIMEOUT_SECONDS=30
AI_CONTEXT_TURNS=5
MAX_MESSAGE_LENGTH=1000
CORS_ORIGINS=
```

| 키 | 기본값 | 설명 | 민감 |
|----|--------|------|:----:|
| `GEMINI_API_KEY` | (없음) | Google Gemini API 키 — **서버에서만 사용** | ✅ |
| `JWT_SECRET_KEY` | (없음) | JWT 서명 키. 충분히 긴 난수 (`python -c "import secrets;print(secrets.token_urlsafe(48))"`) | ✅ |
| `JWT_ALGORITHM` | `HS256` | 서명 알고리즘. 디코드 시에도 이 값으로 **고정** | |
| `JWT_EXPIRE_MINUTES` | `60` | 토큰 만료(분). 응답 `expires_in` = ×60 | |
| `DATABASE_URL` | `sqlite:///./data/app.db` | SQLAlchemy URL | |
| `AI_TIMEOUT_SECONDS` | `30` | Gemini 호출 제한 시간(초) | |
| `AI_CONTEXT_TURNS` | `5` | 프롬프트에 포함할 최근 Q/A 수 | |
| `MAX_MESSAGE_LENGTH` | `1000` | 질문 최대 글자수 | |
| `CORS_ORIGINS` | (없음) | 허용 Origin, 쉼표 구분. 예: `http://localhost:5173,https://<앱>.vercel.app` | |

### `frontend/.env`

```
VITE_API_BASE_URL=http://localhost:8000
```

> **프론트 `.env` 에는 비밀값을 절대 넣지 않는다.** `VITE_` 접두어 변수는 빌드 결과물에 그대로 포함되어 브라우저에서 볼 수 있다. Gemini 키는 백엔드에만 둔다.

## 4. 로컬 실행 확인

```bash
# 1) 백엔드
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload

# 2) 프론트 (새 터미널)
cd frontend && npm run dev

# 3) API 확인
curl -X POST http://localhost:8000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234","nickname":"어썸체크"}'

TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"message":"FastAPI에서 CORS 설정은 어떻게 해?"}'

curl -H "Authorization: Bearer $TOKEN" 'http://localhost:8000/api/me/chats?limit=20&offset=0'
```

## 5. CORS 설정

프론트(Vercel)와 백엔드(Render)가 **다른 도메인**이므로 CORS 가 필수다.

```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,   # 개발 서버 + Vercel 도메인
    allow_credentials=False,                    # JWT 헤더 방식이라 쿠키 불필요
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)
```

- 개발: `http://localhost:5173`, `http://127.0.0.1:5173`
- 배포: `https://<앱>.vercel.app` (+ Vercel 프리뷰 도메인이 필요하면 함께 추가)
- `allow_origins=["*"]` 는 쓰지 않는다.

## 6. 배포

### 6-1. 백엔드 — Render

| 항목 | 값 |
|------|-----|
| 서비스 종류 | Web Service (무료) |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| 환경변수 | Render 대시보드 **Environment** 에 §3 의 키를 등록 (`.env` 파일 업로드 금지) |

체크 포인트
- `CORS_ORIGINS` 에 Vercel 도메인을 넣는다.
- **15분 유휴 시 슬립** → 첫 요청이 수십 초 걸릴 수 있다. 평가 직전에 한 번 깨워 두거나, 프론트에서 첫 로딩 시 안내 문구를 띄운다.
- 파일시스템이 영속되지 않으므로 SQLite 데이터가 재배포 시 사라질 수 있다 → [04-database.md](04-database.md) "운영 주의: Render 디스크"

### 6-2. 프론트 — Vercel

| 항목 | 값 |
|------|-----|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| 환경변수 | `VITE_API_BASE_URL=https://<Render 백엔드 주소>` |

체크 포인트
- SPA 라우팅: `/chat` 직접 접속(새로고침)이 404 나면 `vercel.json` 에 rewrite 추가

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### 6-3. 배포 순서

1. Render 에 백엔드 먼저 배포 → 백엔드 URL 확보
2. Vercel 환경변수 `VITE_API_BASE_URL` 에 그 URL 입력 → 프론트 배포 → Vercel URL 확보
3. Render 환경변수 `CORS_ORIGINS` 에 Vercel URL 추가 → **백엔드 재배포**
4. README 의 서비스 URL 칸에 Vercel URL 기입

## 7. 외부 접속 검증 (평가 전 필수)

```bash
# 서버 밖(다른 네트워크, 휴대폰 핫스팟 등)에서
curl -i https://<render-backend>/docs
curl -i -X POST https://<render-backend>/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"...","password":"..."}'
```
브라우저로 `https://<앱>.vercel.app` 접속 → 가입 → 로그인 → 질문 → 응답 → 로그 조회까지 전 흐름 재현.

## 8. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-------------|
| 브라우저 콘솔에 CORS 오류 | `CORS_ORIGINS` 에 실제 프론트 도메인 누락 → 추가 후 Render 재배포 |
| 첫 요청이 30초 이상 걸림 | Render 무료 플랜 슬립에서 깨어나는 중 (콜드 스타트). 미리 한 번 호출해 둔다 |
| 로그인은 되는데 이후 요청이 401 | axios 인터셉터가 `Authorization` 헤더를 붙이지 않음 / 토큰 저장 키 불일치 |
| 배포 후 계속 401 | Render 재배포로 SQLite 가 초기화되어 계정이 사라짐 → 재가입 |
| 모든 질문이 `AI_CALL_FAILED` | `GEMINI_API_KEY` 미설정·오류. 로그 `ai_call_failed reason=` 확인 (`auth_failed` / `rate_limited` / `status_5xx`) |
| 가끔 `AI_CALL_FAILED` (429) | Gemini 무료 티어 rate limit. 잠시 후 재시도 |
| 응답이 계속 `AI_TIMEOUT` | `AI_TIMEOUT_SECONDS` 가 너무 짧거나 네트워크 지연. 값 조정 후 재배포 |
| `/chat` 새로고침 시 404 | Vercel SPA rewrite 누락 (§6-2) |
| 로컬에서 프론트가 백엔드를 못 찾음 | `frontend/.env` 의 `VITE_API_BASE_URL` 확인, dev 서버 재시작 |

## 9. 민감정보 관리 체크

- `.gitignore` 에 `.env`, `*.db`, `__pycache__`, `node_modules`, `.venv`, `dist`
- 저장소에는 `backend/.env.example`, `frontend/.env.example` 만 (키 이름 수준, 값 없음)
- API 키는 서버 환경변수로만 사용, 응답·프론트 번들에 미포함

```bash
git ls-files | grep -E '(^|/)\.env$'                 # 출력 없어야 함
grep -rn "AIza" --exclude-dir={node_modules,.venv,dist} .   # 출력 없어야 함
```
